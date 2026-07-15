import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Portal -> stripe-cancel-product Edge Function. Lets a client (or an
// admin viewing-as) remove ONE of their 5 outcome products from their
// single weekly-billing subscription, without touching the other 4 or
// cancelling the whole account. Auth/client_id resolution mirrors
// portal-session/route.ts exactly -- see that file for more detail.
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

  let body: { client_id?: string; product_key?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // client_owner can only ever act on their own client; an admin may pass
  // a client_id to act on behalf of a client they're viewing.
  const clientId = pu.role === 'admin' ? body.client_id : pu.client_id
  const productKey = body.product_key
  if (!clientId || !productKey) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const fnUrl = process.env.STRIPE_CANCEL_PRODUCT_FN_URL
  const secret = process.env.BILLING_SHARED_SECRET
  if (!fnUrl) return NextResponse.json({ error: 'billing_not_configured' }, { status: 500 })

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-flowstate-secret': secret } : {}),
      },
      body: JSON.stringify({ client_id: clientId, product_key: productKey }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      return NextResponse.json({ error: json.reason ?? 'stripe_error' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'stripe_unreachable' }, { status: 502 })
  }
}
