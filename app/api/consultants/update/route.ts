import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// In-portal consultant edit: verify session -> authorized RPC write (RLS/
// has_client_access enforced inside the function) -> fire the GHL Territories
// reconcile via Make. No service_role anywhere in the request path.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: {
    id?: string
    first_name?: string
    last_name?: string
    phone?: string
    active?: boolean
    zip_codes?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  // Authorized write. The RPC self-checks has_client_access(client_id) for the
  // caller and only touches whitelisted columns; it returns the zip diff.
  const { data, error } = await supabase.rpc('portal_update_consultant', {
    p_id: body.id,
    p_first_name: body.first_name ?? '',
    p_last_name: body.last_name ?? '',
    p_phone: body.phone ?? '',
    p_active: body.active ?? true,
    p_zip_codes: body.zip_codes ?? [],
  })
  if (error) {
    const status = error.message.includes('forbidden')
      ? 403
      : error.message.includes('not_found')
        ? 404
        : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  const result = (data ?? {}) as {
    ghl_user_id?: string
    ghl_location_id?: string
    zip_codes?: string[]
    added_zips?: string[]
    removed_zips?: string[]
  }

  // GHL Territories reconcile via Make. Non-fatal: on failure the row stays
  // ghl_sync_status = 'pending' and can be retried.
  const webhook = process.env.CONSULTANT_SYNC_WEBHOOK
  const secret = process.env.CONSULTANT_SYNC_SECRET
  let synced = false
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-flowstate-secret': secret } : {}),
        },
        // secret sent in header AND body so Make can verify with either
        body: JSON.stringify({ action: 'update', secret, consultant_id: body.id, ...result }),
      })
      synced = res.ok
    } catch {
      synced = false
    }
  }

  return NextResponse.json({ ok: true, synced, ...result })
}
