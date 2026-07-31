'use client'

import { useState } from 'react'
import { Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { COMPONENT_LIST, COMPONENT_LABELS as OUTCOME_LABELS } from '@/lib/components'

// Extracted out of BillingClient.tsx so it can live on the My Account page
// instead (Bart's call: this belongs next to profile/billing management,
// not mixed into the billable-events ledger). Self-contained -- owns its
// own on/off state, only needs the client id + real Stripe-backed status
// from the server to get going.
interface OutcomeSubscriptionsPanelProps {
  activeClientId: string
  activeComponents: { component_key: string; status: string }[]
}

export default function OutcomeSubscriptionsPanel({
  activeClientId,
  activeComponents,
}: OutcomeSubscriptionsPanelProps) {
  // Seeded from activeComponents (real data from Stripe via
  // stripe-subscription-sync, fetched fresh by the server component on
  // every page load) -- not a client-side guess. Updated optimistically
  // the moment a Turn On/Off click succeeds, so the UI reflects it
  // instantly instead of waiting on a page refresh + webhook round-trip.
  const [cancelledComponents, setCancelledComponents] = useState<Set<string>>(
    () => new Set(activeComponents.filter((c) => c.status === 'cancelled').map((c) => c.component_key))
  )
  // Tracks whichever component currently has a Turn On / Turn Off request
  // in flight, so we can disable just that one button.
  const [pendingComponentKey, setPendingComponentKey] = useState<string | null>(null)

  // Turns OFF one component -- removes it from the client's weekly-billing
  // subscription via stripe-cancel-component. Doesn't touch the other
  // components or cancel the whole account -- that's a deliberately
  // separate, bigger action (not built here; contact-us for now).
  const handleCancelComponent = async (componentKey: string) => {
    const label = OUTCOME_LABELS[componentKey] || componentKey
    const confirmed = window.confirm(
      `Turn off "${label}"? This removes it from your weekly invoice going forward. You can turn it back on any time.`
    )
    if (!confirmed) return

    setPendingComponentKey(componentKey)
    try {
      const res = await fetch('/api/billing/cancel-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: activeClientId, component_key: componentKey }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        if (json.error === 'last_component_use_full_cancel') {
          toast.error('This is your last active component. To stop all billing, contact us to cancel your account.')
        } else {
          toast.error('Could not turn that component off. Try again shortly.')
        }
        return
      }
      setCancelledComponents((prev) => new Set(prev).add(componentKey))
      toast.success(`${label} turned off -- removed from your weekly billing.`)
    } catch {
      toast.error('Could not reach billing. Check your connection and try again.')
    } finally {
      setPendingComponentKey(null)
    }
  }

  // Turns ON one component -- adds it back to the client's weekly-billing
  // subscription via stripe-reactivate-component. Under the hood this
  // creates a brand-new subscription item (Stripe can't "undo" a deleted
  // one), but from the client's side it's just flipping a switch back on.
  const handleReactivateComponent = async (componentKey: string) => {
    const label = OUTCOME_LABELS[componentKey] || componentKey

    setPendingComponentKey(componentKey)
    try {
      const res = await fetch('/api/billing/reactivate-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: activeClientId, component_key: componentKey }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error('Could not turn that component on. Try again shortly.')
        return
      }
      setCancelledComponents((prev) => {
        const next = new Set(prev)
        next.delete(componentKey)
        return next
      })
      toast.success(`${label} is back on -- included in your next weekly invoice.`)
    } catch {
      toast.error('Could not reach billing. Check your connection and try again.')
    } finally {
      setPendingComponentKey(null)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Outcome Subscriptions
        </span>
        <span className="text-xs text-muted-foreground">
          One weekly invoice covers all active components below.
        </span>
      </div>
      {/* Two-up, not five-across -- each card gets room for a real
          description of what the component does, not just a label. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {COMPONENT_LIST.map((component) => {
          const isCancelled = cancelledComponents.has(component.key)
          const isPending = pendingComponentKey === component.key
          return (
            <div
              key={component.key}
              className={`rounded-xl border p-5 ${
                isCancelled ? 'border-border bg-muted/30' : 'border-border bg-background'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className={`text-base font-semibold ${isCancelled ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {component.labelPlural}
                </h3>
                {isCancelled ? (
                  // Off = red, and says exactly what clicking it does. We
                  // don't expect anyone to land here often (no billing, no
                  // problem) but when they do, the fix should be obvious.
                  <button
                    onClick={() => handleReactivateComponent(component.key)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <PowerOff size={13} />
                    {isPending ? 'Turning on…' : 'Turn Back On'}
                  </button>
                ) : (
                  // On = green, reads as a status ("On") rather than an
                  // invitation to turn it off. Clicking still opens the
                  // confirm dialog in handleCancelComponent -- the route to
                  // turn it off exists, it's just not the loud option.
                  <button
                    onClick={() => handleCancelComponent(component.key)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  >
                    <Power size={13} />
                    {isPending ? 'Turning off…' : 'On'}
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{component.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
