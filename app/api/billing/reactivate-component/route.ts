import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'

// Lets a client (or an admin viewing-as) turn a previously-cancelled
// outcome component back on -- adds it back to their weekly-billing
// subscription as a new metered line item (Stripe can't "undo" a deleted
// item, so this creates a fresh one tagged the same way).
//
// Used to proxy to the stripe-reactivate-component Edge Function (renamed
// from stripe-reactivate-product) -- moved to a direct Stripe call here for
// the same reason as portal-session/route.ts and cancel-component/route.ts.
//
// NAMING NOTE: Stripe's own subscription-item metadata key is still
// literally "product_key" (unchanged on purpose -- see cancel-component's
// header note).
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

  // admin and client_owner always have billing access; a client_manager
  // only does if they're a super manager.
  const hasBillingAccess =
    pu.role === 'admin' || pu.role === 'client_owner' || (pu.role === 'client_manager' && pu.is_super_manager === true)
  if (!hasBillingAccess) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { client_id?: string; component_key?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const clientId = pu.role === 'admin' ? body.client_id : pu.client_id
  const componentKey = body.component_key
  if (!clientId || !componentKey) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  // Price id comes from component_prices now (renamed from product_prices --
  // synced live from Stripe by stripe-price-sync) instead of a hardcoded
  // map -- pricing lives in exactly one place (Stripe). component_prices
  // has an "authenticated can select" RLS policy, so the normal
  // session-scoped client can read it directly. Emergency fallback only
  // kicks in if that table is somehow empty or unreachable.
  const EMERGENCY_FALLBACK_PRICE_IDS: Record<string, string> = {
    sit: process.env.PRICE_ID_SIT ?? 'price_1TmJLaHQFfAlfTssplyQSxIs',
    proposal_followup: process.env.PRICE_ID_PROPOSAL_FOLLOWUP ?? 'price_1TtA5sHQFfAlfTssQJ2E7wyS',
    reactivation: process.env.PRICE_ID_REACTIVATION ?? 'price_1TtA9fHQFfAlfTssQUaWf4KR',
    referral: process.env.PRICE_ID_REFERRAL ?? 'price_1TtANsHQFfAlfTssDikgm1Rw',
    review: process.env.PRICE_ID_REVIEW ?? 'price_1TtACOHQFfAlfTssTAMLcZXj',
  }

  const { data: priceRow } = await supabase
    .from('component_prices')
    .select('stripe_price_id')
    .eq('component_key', componentKey)
    .maybeSingle()
  const price = priceRow?.stripe_price_id ?? EMERGENCY_FALLBACK_PRICE_IDS[componentKey]

  if (!price) return NextResponse.json({ error: 'unknown_component' }, { status: 400 })

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
    const alreadyActive = items.data.some((i) => i.metadata?.product_key === componentKey)
    if (alreadyActive) return NextResponse.json({ ok: true, already_active: true })

    await stripe.subscriptionItems.create({
      subscription: client.stripe_subscription_id,
      price,
      metadata: { product_key: componentKey },
      proration_behavior: 'none',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('reactivate-component stripe call failed:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 })
  }
}
