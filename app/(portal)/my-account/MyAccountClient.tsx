'use client'

import { useState } from 'react'
import { CreditCard, Save, User, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import type { ClientProfile } from '@/types/supabase'
import OutcomeSubscriptionsPanel from '@/components/billing/OutcomeSubscriptionsPanel'

interface MyAccountClientProps {
  client: ClientProfile
  activeProducts: { product_key: string; status: string }[]
}

// Editable profile fields. Kept as one flat object so a single onChange
// handler + a single save call can cover all of them -- see EDITABLE_FIELDS
// in /api/account/update-profile/route.ts for the server-side whitelist
// this must stay in sync with.
interface ProfileForm {
  company_name: string
  primary_contact_name: string
  primary_contact_email: string
  phone: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

function toForm(client: ClientProfile): ProfileForm {
  return {
    company_name: client.company_name ?? '',
    primary_contact_name: client.primary_contact_name ?? '',
    primary_contact_email: client.primary_contact_email ?? '',
    phone: client.phone ?? '',
    website: client.website ?? '',
    address_line1: client.address_line1 ?? '',
    address_line2: client.address_line2 ?? '',
    city: client.city ?? '',
    state: client.state ?? '',
    postal_code: client.postal_code ?? '',
    country: client.country ?? 'US',
  }
}

export default function MyAccountClient({ client, activeProducts }: MyAccountClientProps) {
  const [form, setForm] = useState<ProfileForm>(() => toForm(client))
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSaveProfile = async () => {
    if (!form.company_name.trim()) {
      toast.error('Company name is required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/account/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, ...form }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        toast.error('Could not save your changes. Try again shortly.')
        return
      }
      toast.success('Account details saved.')
    } catch {
      toast.error('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // Opens Stripe's hosted Customer Portal -- card on file, invoices,
  // receipts. Deliberately NOT rebuilt in-house: this is the one place
  // actual card data changes hands, and Stripe's hosted flow keeps that
  // PCI scope off our servers entirely.
  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
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

  const inputClass =
    'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
  const labelClass = 'text-xs font-semibold text-muted-foreground mb-1 block'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your company details, address, and billing.
        </p>
      </div>

      {/* Profile section */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <User size={16} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Company & Contact
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Company Name</label>
            <input className={inputClass} value={form.company_name} onChange={handleChange('company_name')} />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input
              className={inputClass}
              value={form.website}
              onChange={handleChange('website')}
              placeholder="https://"
            />
          </div>
          <div>
            <label className={labelClass}>Contact Name</label>
            <input
              className={inputClass}
              value={form.primary_contact_name}
              onChange={handleChange('primary_contact_name')}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={form.phone} onChange={handleChange('phone')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Contact Email
              <span className="font-normal normal-case text-muted-foreground/70 ml-1">
                (separate from your billing email, if different)
              </span>
            </label>
            <input
              className={inputClass}
              type="email"
              value={form.primary_contact_email}
              onChange={handleChange('primary_contact_email')}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <MapPin size={16} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Address
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Address Line 1</label>
            <input className={inputClass} value={form.address_line1} onChange={handleChange('address_line1')} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address Line 2</label>
            <input className={inputClass} value={form.address_line2} onChange={handleChange('address_line2')} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input className={inputClass} value={form.city} onChange={handleChange('city')} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input className={inputClass} value={form.state} onChange={handleChange('state')} />
          </div>
          <div>
            <label className={labelClass}>Postal Code</label>
            <input className={inputClass} value={form.postal_code} onChange={handleChange('postal_code')} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input className={inputClass} value={form.country} onChange={handleChange('country')} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Billing section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Billing</h2>
            <p className="text-sm text-muted-foreground">
              Manage your subscription and payment method.
            </p>
          </div>
          <button
            onClick={handleManageBilling}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer shadow-md whitespace-nowrap"
          >
            <CreditCard size={16} />
            <span>Manage Payment Method & Invoices</span>
          </button>
        </div>

        <OutcomeSubscriptionsPanel activeClientId={client.id} activeProducts={activeProducts} />
      </div>
    </div>
  )
}
