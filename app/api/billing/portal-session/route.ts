import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'

// Portal -> Stripe hosted Customer Portal.
//
// This used to proxy to a Supabase Edge Function (stripe-portal-session)
// purely to keep STRIPE_SECRET_KEY out of Vercel. Bart's call: add the
// secret to Vercel and call Stripe directly here instead -- cuts two
// network hops (Vercel->Supabase, Supabase->Stripe) down to one
// (Vercel->Stripe), which is what was making "Manage Billing" feel slow.
// The Edge Function still exists in Supabase but is no longer called by
// anything -- fine to leave it, nothing points at it anymore.
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

  // RLS (has_client_access) already scopes this to a client the caller
  // is allowed to see -- same policy that lets My Account/Billing load.
  const { data: client } = await supabase
    .from('clients')
    .select('stripe_customer_id')
    .eq('id', clientId)
    .maybeSingle()

  if (!client?.stripe_customer_id) {
    return NextResponse.json({ error: 'no_stripe_customer' }, { status: 404 })
  }

  const siteUrl = process.env.SITE_URL ?? 'https://my.flowstaterevenue.com'

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: `${siteUrl}/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('stripe.billingPortal.sessions.create failed:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 })
  }
}
