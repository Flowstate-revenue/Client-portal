'use client'

import { useState } from 'react'
import { Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { PRODUCT_LIST, PRODUCT_LABELS as OUTCOME_LABELS } from '@/lib/products'

// Extracted out of BillingClient.tsx so it can live on the My Account page
// instead (Bart's call: this belongs next to profile/billing management,
// not mixed into the billable-events ledger). Self-contained -- owns its
// own on/off state, only needs the client id + real Stripe-backed status
// from the server to get going.
interface OutcomeSubscriptionsPanelProps {
  activeClientId: string
  activeProducts: { product_key: string; status: string }[]
}

export default function OutcomeSubscriptionsPanel({
  activeClientId,
  activeProducts,
}: OutcomeSubscriptionsPanelProps) {
  // Seeded from activeProducts (real data from Stripe via
  // stripe-subscription-sync, fetched fresh by the server component on
  // every page load) -- not a client-side guess. Updated optimistically
  // the moment a Turn On/Off click succeeds, so the UI reflects it
  // instantly instead of waiting on a page refresh + webhook round-trip.
  const [cancelledProducts, setCancelledProducts] = useState<Set<string>>(
    () => new Set(activeProducts.filter((p) => p.status === 'cancelled').map((p) => p.product_key))
  )
  // Tracks whichever product currently has a Turn On / Turn Off request
  // in flight, so we can disable just that one button.
  const [pendingProductKey, setPendingProductKey] = useState<string | null>(null)

  // Turns OFF one product -- removes it from the client's weekly-billing
  // subscription via stripe-cancel-product. Doesn't touch the other
  // products or cancel the whole account -- that's a deliberately
  // separate, bigger action (not built here; contact-us for now).
  const handleCancelProduct = async (productKey: string) => {
    const label = OUTCOME_LABELS[productKey] || productKey
    const confirmed = window.confirm(
      `Turn off "${label}"? This removes it from your weekly invoice going forward. You can turn it back on any time.`
    )
    if (!confirmed) return

    setPendingProductKey(productKey)
    try {
      const res = await fetch('/api/billing/cancel-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: activeClientId, product_key: productKey }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        if (json.error === 'last_product_use_full_cancel') {
          toast.error('This is your last active product. To stop all billing, contact us to cancel your account.')
        } else {
          toast.error('Could not turn that product off. Try again shortly.')
        }
        return
      }
      setCancelledProducts((prev) => new Set(prev).add(productKey))
      toast.success(`${label} turned off -- removed from your weekly billing.`)
    } catch {
      toast.error('Could not reach billing. Check your connection and try again.')
    } finally {
      setPendingProductKey(null)
    }
  }

  // Turns ON one product -- adds it back to the client's weekly-billing
  // subscription via stripe-reactivate-product. Under the hood this
  // creates a brand-new subscription item (Stripe can't "undo" a deleted
  // one), but from the client's side it's just flipping a switch back on.
  const handleReactivateProduct = async (productKey: string) => {
    const label = OUTCOME_LABELS[productKey] || productKey

    setPendingProductKey(productKey)
    try {
      const res = await fetch('/api/billing/reactivate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: activeClientId, product_key: productKey }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error('Could not turn that product on. Try again shortly.')
        return
      }
      setCancelledProducts((prev) => {
        const next = new Set(prev)
        next.delete(productKey)
        return next
      })
      toast.success(`${label} is back on -- included in your next weekly invoice.`)
    } catch {
      toast.error('Could not reach billing. Check your connection and try again.')
    } finally {
      setPendingProductKey(null)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Outcome Subscriptions
        </span>
        <span className="text-xs text-muted-foreground">
          One weekly invoice covers all active products below.
        </span>
      </div>
      {/* Two-up, not five-across -- each card gets room for a real
          description of what the product does, not just a label. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PRODUCT_LIST.map((product) => {
          const isCancelled = cancelledProducts.has(product.key)
          const isPending = pendingProductKey === product.key
          return (
            <div
              key={product.key}
              className={`rounded-xl border p-5 ${
                isCancelled ? 'border-border bg-muted/30' : 'border-border bg-background'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className={`text-base font-semibold ${isCancelled ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {product.labelPlural}
                </h3>
                {isCancelled ? (
                  // Off = red, and says exactly what clicking it does. We
                  // don't expect anyone to land here often (no billing, no
                  // problem) but when they do, the fix should be obvious.
                  <button
                    onClick={() => handleReactivateProduct(product.key)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <PowerOff size={13} />
                    {isPending ? 'Turning on…' : 'Turn Back On'}
                  </button>
                ) : (
                  // On = green, reads as a status ("On") rather than an
                  // invitation to turn it off. Clicking still opens the
                  // confirm dialog in handleCancelProduct -- the route to
                  // turn it off exists, it's just not the loud option.
                  <button
                    onClick={() => handleCancelProduct(product.key)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <Power size={13} />
                    {isPending ? 'Turning off…' : 'On'}
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
