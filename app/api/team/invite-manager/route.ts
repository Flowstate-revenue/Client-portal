import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Invites a client_manager for the caller's own client. Authorization is
// checked here, server-side, against the caller's OWN portal_users row --
// client_owner and admin always qualify; a client_manager only qualifies
// if their is_super_manager flag is set (super managers have the same
// team-management rights as the owner). client_id is always resolved
// from the caller's session, never trusted from the request body, so a
// manager can never invite someone into a different client.
//
// The actual auth-user creation + invite email + portal_users insert
// happens in the create-portal-user Edge Function (service role), reusing
// the same idempotent invite logic the GHL onboarding flow uses for
// client_owner. This route is the authorization gate in front of it.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: pu } = await supabase
    .from('portal_users')
    .select('client_id, role, is_super_manager')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!pu) return NextResponse.json({ error: 'no_profile' }, { status: 403 })

  let body: {
    client_id?: string // only honored for admin (viewing-as); ignored otherwise
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
    is_super_manager?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const isAdmin = pu.role === 'admin'
  const isOwner = pu.role === 'client_owner'
  const isAuthorizedManager = pu.role === 'client_manager' && pu.is_super_manager === true
  if (!isAdmin && !isOwner && !isAuthorizedManager) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const clientId = isAdmin ? body.client_id : pu.client_id
  if (!clientId) return NextResponse.json({ error: 'missing_client' }, { status: 400 })
  if (!body.email) return NextResponse.json({ error: 'missing_email' }, { status: 400 })

  const fnUrl = process.env.CREATE_PORTAL_USER_FN_URL
  const secret = process.env.ONBOARD_SHARED_SECRET
  if (!fnUrl || !secret) {
    console.error('invite-manager: missing CREATE_PORTAL_USER_FN_URL / ONBOARD_SHARED_SECRET')
    return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  }

  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-flowstate-secret': secret },
    body: JSON.stringify({
      client_id: clientId,
      role: 'client_manager',
      email: body.email,
      first_name: body.first_name ?? '',
      last_name: body.last_name ?? '',
      phone: body.phone ?? '',
      is_super_manager: body.is_super_manager === true,
    }),
  })

  const result = await res.json().catch(() => ({}))
  if (!res.ok || result?.ok === false) {
    const reason = result?.reason ?? 'invite_failed'
    const status = reason === 'client_not_found' ? 404 : reason === 'missing_email' ? 400 : 502
    return NextResponse.json({ error: reason }, { status })
  }

  return NextResponse.json({ ok: true, existed: result.existed === true })
}
