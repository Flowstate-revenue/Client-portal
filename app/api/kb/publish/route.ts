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

  const [kbRes, urlsRes, faqsRes, targetsRes] = await Promise.all([
    supabase
      .from('client_knowledge_bases')
      .select('id, kb_type, ghl_knowledge_base_id, ghl_location_id')
      .eq('client_id', body.client_id)
      .eq('is_active', true),
    supabase
      .from('kb_urls')
      .select('url, excluded')
      .eq('client_id', body.client_id),
    supabase
      .from('kb_faqs')
      .select('id, question, answer, status')
      .eq('client_id', body.client_id)
      .in('status', ['active', 'deleted'])
      .eq('ghl_sync_status', 'pending'),
    supabase
      .from('kb_faq_targets')
      .select('kb_faq_id, client_knowledge_base_id, ghl_faq_id'),
  ])

  if (kbRes.error) return NextResponse.json({ error: kbRes.error.message }, { status: 400 })
  if (urlsRes.error) return NextResponse.json({ error: urlsRes.error.message }, { status: 400 })
  if (faqsRes.error) return NextResponse.json({ error: faqsRes.error.message }, { status: 400 })
  if (targetsRes.error) return NextResponse.json({ error: targetsRes.error.message }, { status: 400 })

  const knowledgeBases = kbRes.data ?? []
  if (knowledgeBases.length === 0) {
    return NextResponse.json({ error: 'no_active_knowledge_bases' }, { status: 400 })
  }

  const includedUrls = (urlsRes.data ?? []).filter((u) => !u.excluded).map((u) => u.url)

  // targets is keyed loosely here -- Make groups by kb_faq_id per FAQ below.
  const targetsByFaq = new Map<string, { client_knowledge_base_id: string; ghl_faq_id: string | null }[]>()
  for (const t of targetsRes.data ?? []) {
    const list = targetsByFaq.get(t.kb_faq_id) ?? []
    list.push({ client_knowledge_base_id: t.client_knowledge_base_id, ghl_faq_id: t.ghl_faq_id })
    targetsByFaq.set(t.kb_faq_id, list)
  }

  const faqs = (faqsRes.data ?? []).map((f) => ({
    kb_faq_id: f.id,
    question: f.question,
    answer: f.answer,
    status: f.status, // 'active' | 'deleted'
    // Existing GHL faq id per target KB, if this FAQ was already synced there before.
    targets: knowledgeBases.map((kb) => ({
      client_knowledge_base_id: kb.id,
      ghl_faq_id: targetsByFaq.get(f.id)?.find((t) => t.client_knowledge_base_id === kb.id)?.ghl_faq_id ?? null,
    })),
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
          urls: { included: includedUrls },
          faqs,
        }),
      })
    } catch {
      /* publish webhook is best-effort -- Supabase state is already correct either way */
    }
  }

  return NextResponse.json({ ok: true, knowledge_bases: knowledgeBases.length, urls: includedUrls.length, faqs: faqs.length })
}
