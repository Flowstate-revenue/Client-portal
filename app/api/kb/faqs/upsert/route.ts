import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { client_id?: string; faq_id?: string | null; question?: string; answer?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.client_id || !body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('portal_upsert_kb_faq', {
    p_client_id: body.client_id,
    p_faq_id: body.faq_id ?? null,
    p_question: body.question,
    p_answer: body.answer,
  })
  if (error) {
    const status = error.message.includes('forbidden') ? 403 : error.message.includes('not_found') ? 404 : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true, id: (data as { id?: string } | null)?.id })
}
