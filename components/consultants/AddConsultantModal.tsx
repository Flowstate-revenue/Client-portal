'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface AddConsultantModalProps {
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

export default function AddConsultantModal({ clientId, onAdded, onClose }: AddConsultantModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [zipText, setZipText] = useState('')
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
    const raw = zipText.split(/[\s,;]+/).map((z) => z.trim()).filter(Boolean)
    const normalized: string[] = []
    const invalid: string[] = []
    for (const z of raw) {
      const m = z.match(/^(\d{5})(?:-?\d{4})?$/)
      if (m) normalized.push(m[1])
      else invalid.push(z)
    }
    if (invalid.length > 0) {
      toast.error(`Not a valid zip: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/consultants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          zip_codes: Array.from(new Set(normalized)),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const msg =
          json.error === 'duplicate_email'
            ? 'A consultant with that email already exists for this client.'
            : json.error ?? 'Could not add the consultant.'
        throw new Error(msg)
      }
      toast.success('Consultant added — provisioning in GHL. They go live once set up.')
      onAdded()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the consultant.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Add consultant
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
          <input className={inputClass} style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="rep@company.com" />
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            Used as the login identity and the GHL contact/user email.
          </p>
        </Field>

        <Field label="Phone">
          <input className={inputClass} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} placeholder="+15551234567" />
        </Field>

        <Field label="Territory (zip codes)">
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 96, fontFamily: 'ui-monospace, monospace' }}
            value={zipText}
            onChange={(e) => setZipText(e.target.value)}
            disabled={loading}
            placeholder={'21012\n21032\n21122'}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            One per line or comma-separated — we clean it up automatically.
          </p>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Add consultant'}
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
