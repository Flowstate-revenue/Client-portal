import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Batched "Publish changes" for the Knowledge Base review pages. Reads the
// CURRENT full state (active KB targets, included URLs, all FAQs incl.
// pending deletes) straight from Supabase -- RLS already scopes every query
// below to what the caller is allowed to see -- and hands it to Make in one
// shot. Make does the actual authenticated writes to GHL's
// /knowledge-bases/* API and reports FAQ-level results back to
// kb-sync-ingest, which updates ghl_sync_status per FAQ.
//
// Full-state (not diff-only) on purpose: Make's existing KB scenarios
// already reconcile against GHL's live state (matching FAQs, resolving URL
// ids fresh per publish), so handing over "here's everything that should be
// true right now" is simpler and more resilient than trying to compute an
// exact diff here.
// Each known KB has its own id column on kb_urls (urls are trained per-KB,
// not shared) -- this is the one place that mapping needs to be spelled out.
const KB_URL_ID_COLUMNS = [
  { kb_type: 'core', column: 'core_kb_url_id' },
  { kb_type: 'sit', column: 'sit_kb_url_id' },
  { kb_type: 'proposal_followup', column: 'proposal_followup_kb_url_id' },
  { kb_type: 'reactivation', column: 'reactivation_kb_url_id' },
  { kb_type: 'review', column: 'review_kb_url_id' },
  { kb_type: 'referral', column: 'referral_kb_url_id' },
] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { client_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.client_id) return NextResponse.json({ error: 'missing_client' }, { status: 400 })

  const [kbRes, urlsRes, faqsRes] = await Promise.all([
    supabase
      .from('client_knowledge_bases')
      .select('id, kb_type, ghl_knowledge_base_id, ghl_location_id')
      .eq('client_id', body.client_id)
      .eq('is_active', true),
    supabase
      .from('kb_urls')
      .select(
        'url, excluded, core_kb_url_id, sit_kb_url_id, proposal_followup_kb_url_id, reactivation_kb_url_id, review_kb_url_id, referral_kb_url_id'
      )
      .eq('client_id', body.client_id),
    supabase
      .from('kb_faqs')
      .select('id, kb_type, question, answer, status, ghl_faq_id')
      .eq('client_id', body.client_id)
      .in('status', ['active', 'deleted'])
      .eq('ghl_sync_status', 'pending'),
  ])

  if (kbRes.error) return NextResponse.json({ error: kbRes.error.message }, { status: 400 })
  if (urlsRes.error) return NextResponse.json({ error: urlsRes.error.message }, { status: 400 })
  if (faqsRes.error) return NextResponse.json({ error: faqsRes.error.message }, { status: 400 })

  const knowledgeBases = kbRes.data ?? []
  if (knowledgeBases.length === 0) {
    return NextResponse.json({ error: 'no_active_knowledge_bases' }, { status: 400 })
  }

  const urls = urlsRes.data ?? []
  const includedUrls = urls.filter((u) => !u.excluded).map((u) => u.url)

  const kbIdByType = new Map(knowledgeBases.map((kb) => [kb.kb_type, kb.ghl_knowledge_base_id]))

  // Urls are trained per-KB (each of the 6 KBs assigns its own id to the
  // same url), so an excluded url can need up to 6 separate deletes --
  // one per KB it actually has a non-null id for. A url excluded before a
  // given KB ever trained it just has nothing to send for that KB.
  const deleteUrls = urls
    .filter((u) => u.excluded)
    .flatMap((u) =>
      KB_URL_ID_COLUMNS.filter(({ column }) => Boolean((u as Record<string, unknown>)[column])).map(({ kb_type, column }) => ({
        url: u.url,
        kb_type,
        ghl_knowledge_base_id: kbIdByType.get(kb_type) ?? null,
        ghl_url_id: (u as Record<string, unknown>)[column] as string,
      }))
    )

  // A FAQ belongs to exactly one KB now (kb_type is fixed on the row), so
  // no more per-target fan-out -- just the row plus which KB it's scoped to.
  const faqs = (faqsRes.data ?? []).map((f) => ({
    kb_faq_id: f.id,
    kb_type: f.kb_type,
    question: f.question,
    answer: f.answer,
    status: f.status, // 'active' | 'deleted'
    ghl_faq_id: f.ghl_faq_id, // existing GHL id if already synced there, else null (create)
  }))

  const webhook = process.env.KB_PUBLISH_WEBHOOK
  const secret = process.env.KB_PUBLISH_SECRET
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-flowstate-secret': secret } : {}),
        },
        body: JSON.stringify({
          action: 'publish',
          client_id: body.client_id,
          knowledge_bases: knowledgeBases,
          urls: { included: includedUrls, delete: deleteUrls },
          faqs,
        }),
      })
    } catch {
      /* publish webhook is best-effort -- Supabase state is already correct either way */
    }
  }

  return NextResponse.json({
    ok: true,
    knowledge_bases: knowledgeBases.length,
    urls: includedUrls.length,
    url_deletes: deleteUrls.length,
    faqs: faqs.length,
  })
}
