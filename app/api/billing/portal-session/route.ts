import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Portal -> Stripe hosted Customer Portal. Verifies the session, resolves the
// caller's client, and asks the stripe-portal-session Edge Function for a
// hosted portal URL where they can see their active subscription, update
// their card, and download invoices. No Stripe keys in this app.
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

  // client_owner manages their own client; an admin may pass a client_id (view-as)
  let bodyClientId: string | undefined
  try {
    bodyClientId = (await request.json())?.client_id
  } catch {
    bodyClientId = undefined
  }
  const clientId = pu.role === 'admin' ? bodyClientId : pu.client_id
  if (!clientId) return NextResponse.json({ error: 'no_client' }, { status: 400 })

  const fnUrl = process.env.STRIPE_PORTAL_FN_URL
  const secret = process.env.BILLING_SHARED_SECRET
  if (!fnUrl) return NextResponse.json({ error: 'billing_not_configured' }, { status: 500 })

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-flowstate-secret': secret } : {}),
      },
      body: JSON.stringify({ client_id: clientId }),
    })
    const json = await res.json()
    if (!res.ok || !json.url) {
      return NextResponse.json({ error: json.reason ?? 'stripe_error' }, { status: 502 })
    }
    return NextResponse.json({ url: json.url })
  } catch {
    return NextResponse.json({ error: 'stripe_unreachable' }, { status: 502 })
  }
}
