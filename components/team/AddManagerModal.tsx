'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface AddManagerModalProps {
  // Only actually used server-side when the caller is an admin viewing-as
  // a client -- /api/team/invite-manager ignores this for a non-admin
  // caller and resolves the client from their own session instead. Still
  // always passed so the admin path works.
  clientId: string
  onAdded: () => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0'
const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

export default function AddManagerModal({ clientId, onAdded, onClose }: AddManagerModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSuperManager, setIsSuperManager] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('A valid email is required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/team/invite-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          is_super_manager: isSuperManager,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not invite this manager.')

      toast.success(
        json.existed
          ? 'That person already has portal access.'
          : 'Invite sent — they’ll get an email to set their password.'
      )
      onAdded()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not invite this manager.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Add a manager
      </h2>

      <form className="space-y-4" onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input className={inputClass} style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} autoFocus />
          </Field>
          <Field label="Last name">
            <input className={inputClass} style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
          </Field>
        </div>

        <Field label="Email">
          <input className={inputClass} style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="manager@company.com" />
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            They’ll get an email invite to set their own password.
          </p>
        </Field>

        <Field label="Phone">
          <input className={inputClass} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} placeholder="+15551234567" />
        </Field>

        <div className="pt-1">
          <ScopeToggle
            label="Make this person a Super Manager"
            description="Full access, same as you: add/edit/remove other managers, billing & subscriptions, and consultants. Off = consultants only."
            checked={isSuperManager}
            onChange={setIsSuperManager}
            disabled={loading}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Send invite'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ScopeToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ border: '1px solid var(--border)' }}>
      <div className="pr-4">
        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-50"
        style={{ backgroundColor: checked ? 'var(--primary)' : 'var(--border)' }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(4px)', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
        />
      </button>
    </div>
  )
}
