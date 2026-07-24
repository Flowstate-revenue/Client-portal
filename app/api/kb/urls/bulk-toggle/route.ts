import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { client_id?: string; url_ids?: string[]; excluded?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.client_id || !Array.isArray(body.url_ids) || body.url_ids.length === 0 || typeof body.excluded !== 'boolean') {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('portal_bulk_set_kb_url_exclusion', {
    p_client_id: body.client_id,
    p_url_ids: body.url_ids,
    p_excluded: body.excluded,
  })
  if (error) {
    const status = error.message.includes('forbidden') ? 403 : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true, updated: data })
}
