import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Saves My Account profile edits. Deliberately does NOT use the service
// role -- this runs as the logged-in user's own Supabase session, so the
// clients_update_own RLS policy (private.has_client_access) is what
// actually enforces "you can only edit your own client row." That policy
// is row-level, not column-level, so the real restriction to "only these
// specific fields" happens right here: EDITABLE_FIELDS is a fixed
// whitelist, and anything else in the request body is simply ignored,
// no matter what a client's browser sends.
//
// Deliberately NOT included here: billing_email, stripe_customer_id,
// stripe_subscription_id, billing_day, deposit_sits_remaining, or any
// other billing/Stripe-linked field -- those are only ever written by the
// Edge Functions, never from this route.
const EDITABLE_FIELDS = [
  'company_name',
  'primary_contact_name',
  'primary_contact_email',
  'phone',
  'website',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: pu } = await supabase
    .from('portal_users')
    .select('client_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!pu) return NextResponse.json({ error: 'no_profile' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // client_owner can only ever edit their own client; an admin may pass a
  // client_id to edit on behalf of a client they're viewing.
  const clientId = pu.role === 'admin' ? (body.client_id as string | undefined) : pu.client_id
  if (!clientId) return NextResponse.json({ error: 'no_client' }, { status: 400 })

  // Build the update payload from ONLY the whitelisted keys present in
  // the request -- anything else sent is silently dropped.
  const updates: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_editable_fields' }, { status: 400 })
  }

  const { error } = await supabase.from('clients').update(updates).eq('id', clientId)
  if (error) {
    console.error('Profile update failed:', error)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
