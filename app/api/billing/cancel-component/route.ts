import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'

// Lets a client (or an admin viewing-as) remove ONE of their 5 outcome
// components from their single weekly-billing subscription, without
// touching the other 4 or cancelling the whole account.
//
// Used to proxy to the stripe-cancel-component Edge Function (renamed from
// stripe-cancel-product) -- moved to a direct Stripe call here for the same
// reason as portal-session/route.ts (cuts the Vercel->Supabase->Stripe
// chain down to Vercel->Stripe). The resulting customer.subscription.updated
// webhook still fires and still flows to stripe-subscription-sync exactly
// as before, since that's driven by Stripe, not by which app called the API.
//
// NAMING NOTE: Stripe's own subscription-item metadata key is still
// literally "product_key" (unchanged on purpose -- it's already live on
// real subscription items; only our own DB/code naming renamed to
// "component"). This route reads/writes that Stripe metadata key as-is.
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

  // client_owner/client_manager can only ever act on their own client; an
  // admin may pass a client_id to act on behalf of a client they're viewing.
  const clientId = pu.role === 'admin' ? body.client_id : pu.client_id
  const componentKey = body.component_key
  if (!clientId || !componentKey) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

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

    const target = items.data.find((i) => i.metadata?.product_key === componentKey)
    if (!target) return NextResponse.json({ error: 'component_not_found' }, { status: 404 })

    if (items.data.length <= 1) {
      // Would leave the subscription with zero items, which Stripe
      // rejects. Full cancellation is a different, deliberate action --
      // not this one. Error string kept exact -- the frontend
      // (OutcomeSubscriptionsPanel) matches on it specifically.
      return NextResponse.json({ error: 'last_component_use_full_cancel' }, { status: 409 })
    }

    await stripe.subscriptionItems.del(target.id, { proration_behavior: 'none' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('cancel-component stripe call failed:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 })
  }
}
