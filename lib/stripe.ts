import Stripe from 'stripe'

// Shared server-side Stripe client for the Vercel app. Used ONLY by the
// three billing action routes (portal-session, cancel-component,
// reactivate-component) that used to proxy to Supabase Edge Functions.
//
// Why this changed: those three actions were each a 3-hop chain (browser
// -> Vercel -> Supabase Edge Function -> Stripe, then all the way back)
// purely so STRIPE_SECRET_KEY never had to live in Vercel. That was a
// deliberate call early in this build, but it made "Manage Billing" feel
// slow -- two extra network round trips just to open a redirect. Bart's
// call: add the secret to Vercel and cut the middle hop for these three
// actions specifically.
//
// Everything else stays exactly as it was: the deposit checkout flow
// (stripe-checkout-start/-complete), the subscription-sync webhook, and
// meter/usage reporting all still live in Supabase Edge Functions, since
// those are webhook-driven or need the service-role DB access that only
// makes sense running close to the database. This file is deliberately
// scoped to the three low-latency, user-initiated actions only.
//
// Import this as `import { stripe } from '@/lib/stripe'` -- never
// instantiate a second `new Stripe(...)` elsewhere in the app.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
})
