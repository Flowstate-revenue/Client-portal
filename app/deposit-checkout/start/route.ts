import { NextResponse } from 'next/server'

// Payment-first signup, step 1 of 2 on the app side.
//
// This is the exact URL the "Start Your Revenue Engine" / "Turn On Engine"
// button on the marketing site (GHL) should link to directly -- a plain
// <a href>, no JS needed. There's no login, no form, nothing to fill in
// here: we just forward straight to the stripe-checkout-start Edge
// Function, which opens Stripe's hosted Checkout page for the $1,180
// deposit. Stripe collects their email and card; nothing sensitive ever
// passes through this route or this app.
//
// Why a route here instead of linking the marketing button straight at
// the Supabase function URL: keeps the public-facing link on our own
// domain, so the backend function name/URL can change later without
// having to go edit the marketing site.
//
// Env: STRIPE_CHECKOUT_START_FN_URL
export async function GET() {
  const fnUrl = process.env.STRIPE_CHECKOUT_START_FN_URL
  if (!fnUrl) {
    // Misconfiguration -- fail loud rather than silently 404, since this
    // is the top of the entire signup funnel.
    return NextResponse.json({ error: 'checkout_not_configured' }, { status: 500 })
  }
  return NextResponse.redirect(fnUrl, { status: 307 })
}
