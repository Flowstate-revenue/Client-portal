import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Portal -> stripe-reactivate-product Edge Function. Lets a client (or an
// admin viewing-as) turn a previously-cancelled outcome product back on --
// adds it back to their weekly-billing subscription. Mirrors
// cancel-product/route.ts's auth pattern exactly; see that file for more
// detail on the client_id resolution logic.
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

  const clientId = pu.role === 'admin' ? body.client_id : pu.client_id
  const productKey = body.product_key
  if (!clientId || !productKey) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const fnUrl = process.env.STRIPE_REACTIVATE_PRODUCT_FN_URL
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
