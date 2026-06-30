import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { id?: string; ghlUserId?: string | null; ghlLocationId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  // authorize: RLS only returns this consultant if the caller may see it
  const { data: consultant } = await supabase
    .from('consultants')
    .select('id, ghl_user_id, ghl_location_id')
    .eq('id', body.id)
    .maybeSingle()
  if (!consultant) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const webhook = process.env.CONSULTANT_DELETE_WEBHOOK
  const secret = process.env.CONSULTANT_DELETE_SECRET
  if (!webhook) {
    return NextResponse.json({ error: 'delete_webhook_not_configured' }, { status: 500 })
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-flowstate-secret': secret } : {}),
      },
      body: JSON.stringify({
        action: 'delete',
        ghl_user_id: consultant.ghl_user_id,
        ghl_location_id: consultant.ghl_location_id,
      }),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'webhook_failed' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'webhook_unreachable' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
