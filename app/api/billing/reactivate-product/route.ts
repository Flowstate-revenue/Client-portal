import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'

// Lets a client (or an admin viewing-as) turn a previously-cancelled
// outcome product back on -- adds it back to their weekly-billing
// subscription as a new metered line item (Stripe can't "undo" a deleted
// item, so this creates a fresh one tagged the same way).
//
// Used to proxy to the stripe-reactivate-product Edge Function -- moved
// to a direct Stripe call here for the same reason as
// portal-session/route.ts and cancel-product/route.ts.
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

  // Same 5 outcome prices as stripe-checkout-complete -- product_key here
  // must match lib/products.ts PRODUCT_KEYS exactly.
  const PRICE_IDS: Record<string, string> = {
    sit: process.env.PRICE_ID_SIT ?? 'price_1TmJLaHQFfAlfTssplyQSxIs',
    proposal_followup: process.env.PRICE_ID_PROPOSAL_FOLLOWUP ?? 'price_1TtA5sHQFfAlfTssQJ2E7wyS',
    reactivation: process.env.PRICE_ID_REACTIVATION ?? 'price_1TtA9fHQFfAlfTssQUaWf4KR',
    referral: process.env.PRICE_ID_REFERRAL ?? 'price_1TtANsHQFfAlfTssDikgm1Rw',
    review: process.env.PRICE_ID_REVIEW ?? 'price_1TtACOHQFfAlfTssTAMLcZXj',
  }
  const price = PRICE_IDS[productKey]
  if (!price) return NextResponse.json({ error: 'unknown_product' }, { status: 400 })

  // RLS (has_client_access) scopes this to a client the caller can see.
  const { data: client } = await supabase
    .from('clients')
    .select('stripe_subscription_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!client?.stripe_subscription_id) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 404 })
  }

  try {
    const items = await stripe.subscriptionItems.list({
      subscription: client.stripe_subscription_id,
      limit: 100,
    })
    const alreadyActive = items.data.some((i) => i.metadata?.product_key === productKey)
    if (alreadyActive) return NextResponse.json({ ok: true, already_active: true })

    await stripe.subscriptionItems.create({
      subscription: client.stripe_subscription_id,
      price,
      metadata: { product_key: productKey },
      proration_behavior: 'none',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('reactivate-product stripe call failed:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 })
  }
}
