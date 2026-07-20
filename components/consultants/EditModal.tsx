'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Consultant } from '@/types/consultant'

interface EditModalProps {
  consultant: Consultant
  onSaved: (updated: Consultant) => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0'
const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

export default function EditModal({ consultant, onSaved, onClose }: EditModalProps) {
  const [firstName, setFirstName] = useState(consultant.firstName)
  const [lastName, setLastName] = useState(consultant.lastName)
  const [phone, setPhone] = useState(consultant.phone)
  const [routingPaused, setRoutingPaused] = useState(consultant.routingPaused)
  const [routingWeight, setRoutingWeight] = useState(consultant.routingWeight)
  const [zipText, setZipText] = useState(consultant.zipCodes.join('\n'))
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.')
      return
    }
    const raw = zipText
      .split(/[\s,;]+/)
      .map((z) => z.trim())
      .filter(Boolean)
    const normalized: string[] = []
    const invalid: string[] = []
    for (const z of raw) {
      // accept a 5-digit zip or a ZIP+4 (with or without hyphen), keep the base 5
      const m = z.match(/^(\d{5})(?:-?\d{4})?$/)
      if (m) normalized.push(m[1])
      else invalid.push(z)
    }
    if (invalid.length > 0) {
      toast.error(
        `Not a valid zip: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`
      )
      return
    }
    const zipCodes = Array.from(new Set(normalized))

    setLoading(true)
    try {
      const res = await fetch('/api/consultants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: consultant.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          active: consultant.active,
          routing_paused: routingPaused,
          routing_weight: routingWeight,
          zip_codes: zipCodes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save changes.')

      onSaved({
        ...consultant,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        routingPaused,
        routingWeight,
        zipCodes: (json.zip_codes as string[]) ?? zipCodes,
        ghlSyncStatus: json.synced ? 'synced' : 'pending',
      })
      toast.success(
        json.synced ? 'Saved and synced to routing.' : 'Saved — routing sync is pending.'
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setLoading(false)
    }
  }

  const SHARE_PRESETS = [1, 0.75, 0.5, 0.25]
  const shareOptions = SHARE_PRESETS.includes(routingWeight)
    ? SHARE_PRESETS
    : [routingWeight, ...SHARE_PRESETS]

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Edit {consultant.firstName} {consultant.lastName}
      </h2>

      <form className="space-y-4" onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input
              className={inputClass}
              style={inputStyle}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
          </Field>
          <Field label="Last name">
            <input
              className={inputClass}
              style={inputStyle}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </Field>
        </div>

        <Field label="Email">
          <input
            className={inputClass}
            style={{ ...inputStyle, color: 'var(--subtle)', cursor: 'not-allowed' }}
            value={consultant.email}
            readOnly
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            Email is the login identity and can&apos;t be changed here.
          </p>
        </Field>

        <Field label="Phone">
          <input
            className={inputClass}
            style={inputStyle}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
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
            One per line or comma-separated — we clean it up automatically. Use this <a href="https://www.unitedstateszipcodes.org/zip-code-radius-map.php" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">website</a> to create a list of zipcodes with map view.
          </p>
        </Field>

        <div className="flex items-center justify-between">
          <div className="pr-4">
            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Active
            </span>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              On by default. Turn off to pause this rep for holiday or leave — they stay on the team and keep their zips.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!routingPaused}
            disabled={loading}
            onClick={() => setRoutingPaused((v) => !v)}
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: routingPaused ? 'var(--border)' : 'var(--primary)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150"
              style={{
                transform: routingPaused ? 'translateX(4px)' : 'translateX(22px)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
              }}
            />
          </button>
        </div>

        <Field label="Lead share">
          <select
            className={inputClass}
            style={{ ...inputStyle, opacity: routingPaused ? 0.5 : 1 }}
            value={String(routingWeight)}
            onChange={(e) => setRoutingWeight(Number(e.target.value))}
            disabled={loading || routingPaused}
          >
            {shareOptions.map((w) => (
              <option key={w} value={w}>
                {Math.round(w * 100)}%
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            When a zip has more than one rep, this sets how leads split between them. A rep who&apos;s the only one on a zip always gets 100%.
          </p>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Save changes'}
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
