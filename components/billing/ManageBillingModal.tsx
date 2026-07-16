'use client'

import { CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import OutcomeSubscriptionsPanel from './OutcomeSubscriptionsPanel'

// Lives on the Billing page now (not My Account) -- Bart's call: billing
// management belongs next to the events it bills for, not mixed into
// company/address profile editing. Opened from a "Manage Billing" button,
// shows the 5 outcome products (Turn On/Off) plus a link out to Stripe's
// hosted portal for the actual card/invoices.
interface ManageBillingModalProps {
  activeClientId: string
  activeProducts: { product_key: string; status: string }[]
  onClose: () => void
}

export default function ManageBillingModal({ activeClientId, activeProducts, onClose }: ManageBillingModalProps) {
  // Opens Stripe's hosted Customer Portal -- card on file, invoices,
  // receipts. Deliberately NOT rebuilt in-house: this is the one place
  // actual card data changes hands, and Stripe's hosted flow keeps that
  // PCI scope off our servers entirely.
  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: activeClientId }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(
          json.error === 'no_stripe_customer'
            ? 'No billing account on file yet.'
            : 'Could not open billing portal. Try again shortly.'
        )
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Could not reach billing. Check your connection and try again.')
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="space-y-5 pt-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Manage Billing</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Turn individual products on or off, or manage your payment method and invoices.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleManageBilling}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer shadow-md whitespace-nowrap"
          >
            <CreditCard size={16} />
            <span>Payment Method & Invoices</span>
          </button>
        </div>

        <OutcomeSubscriptionsPanel activeClientId={activeClientId} activeProducts={activeProducts} />
      </div>
    </Modal>
  )
}
