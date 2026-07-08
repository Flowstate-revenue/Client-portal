import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Create a consultant from the portal. The RPC self-authorizes via
// has_client_access(client_id) and inserts under that client. On success we
// fire a webhook so Make provisions the GHL contact (agency, for invites) +
// user (client sub-account), then writes the ghl_user_id back to Supabase.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: {
    client_id?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    zip_codes?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.client_id) return NextResponse.json({ error: 'missing_client' }, { status: 400 })

  const { data, error } = await supabase.rpc('portal_create_consultant', {
    p_client_id: body.client_id,
    p_first_name: body.first_name ?? '',
    p_last_name: body.last_name ?? '',
    p_email: body.email ?? '',
    p_phone: body.phone ?? '',
    p_zip_codes: body.zip_codes ?? [],
  })
  if (error) {
    const status = error.message.includes('forbidden')
      ? 403
      : error.message.includes('duplicate_email')
        ? 409
        : 400
    const key = error.message.includes('duplicate_email') ? 'duplicate_email' : error.message
    return NextResponse.json({ error: key }, { status })
  }

  const result = (data ?? {}) as { id?: string; ghl_location_id?: string; company_name?: string }

  // Provision in GHL via Make (non-fatal — the row exists; provisioning can retry)
  const webhook = process.env.CONSULTANT_PROVISION_WEBHOOK
  const secret = process.env.CONSULTANT_PROVISION_SECRET
  if (webhook && result.id) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-flowstate-secret': secret } : {}),
        },
        body: JSON.stringify({
          action: 'provision',
          consultant_id: result.id,
          client_id: body.client_id,
          ghl_location_id: result.ghl_location_id,
          company_name: result.company_name,
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          phone: body.phone,
          zip_codes: body.zip_codes,
        }),
      })
    } catch {
      /* provisioning webhook is best-effort */
    }
  }

  return NextResponse.json({ ok: true, id: result.id })
}
