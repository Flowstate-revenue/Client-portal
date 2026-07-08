import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Reassign a deleted rep's OPEN opportunities to other reps. The heavy lifting
// (fetching open opps from the automation system and re-owning them) runs async
// in Make; this route authorizes the request, resolves the GHL identities, and
// fires the webhook. Two modes:
//   - round_robin: each open lead is re-routed by its zip (reuses assign-consultant)
//   - heir:        every open lead goes to one chosen rep
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { id?: string; mode?: 'round_robin' | 'heir'; heir_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  const mode = body.mode === 'heir' ? 'heir' : 'round_robin'
  if (mode === 'heir' && !body.heir_id) {
    return NextResponse.json({ error: 'missing_heir' }, { status: 400 })
  }

  // RLS scopes these reads to consultants the caller may see.
  const { data: rep } = await supabase
    .from('consultants')
    .select('id, ghl_user_id, ghl_location_id, client_id')
    .eq('id', body.id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!rep.ghl_user_id) {
    // never provisioned in the automation system — nothing to reassign
    return NextResponse.json({ ok: true, skipped: 'no_ghl_user' })
  }

  let heirGhlUserId: string | null = null
  if (mode === 'heir') {
    const { data: heir } = await supabase
      .from('consultants')
      .select('id, ghl_user_id, active')
      .eq('id', body.heir_id!)
      .maybeSingle()
    if (!heir) return NextResponse.json({ error: 'heir_not_found' }, { status: 400 })
    if (!heir.active) return NextResponse.json({ error: 'heir_inactive' }, { status: 400 })
    if (!heir.ghl_user_id) return NextResponse.json({ error: 'heir_not_ready' }, { status: 400 })
    heirGhlUserId = heir.ghl_user_id
  }

  const webhook = process.env.CONSULTANT_REASSIGN_WEBHOOK
  const secret = process.env.CONSULTANT_REASSIGN_SECRET
  if (!webhook) {
    return NextResponse.json({ error: 'reassign_webhook_not_configured' }, { status: 500 })
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-flowstate-secret': secret } : {}),
      },
      body: JSON.stringify({
        action: 'reassign_leads',
        consultant_id: rep.id,
        client_id: rep.client_id,
        ghl_location_id: rep.ghl_location_id,
        from_ghl_user_id: rep.ghl_user_id,
        mode,
        heir_consultant_id: mode === 'heir' ? body.heir_id : null,
        heir_ghl_user_id: heirGhlUserId,
      }),
    })
    if (!res.ok) return NextResponse.json({ error: 'webhook_failed' }, { status: 502 })
  } catch {
    return NextResponse.json({ error: 'webhook_unreachable' }, { status: 502 })
  }

  // stamp the request time so the panel can show reassignment was kicked off
  await supabase.rpc('portal_mark_leads_reassigned', { p_id: rep.id })

  return NextResponse.json({ ok: true, mode })
}
