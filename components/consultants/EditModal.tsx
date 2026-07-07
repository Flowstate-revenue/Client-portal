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
  const [active, setActive] = useState(consultant.active)
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
    const zipCodes = zipText
      .split(/[\s,;]+/)
      .map((z) => z.trim())
      .filter(Boolean)

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
          active,
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
        active,
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
            One per line or comma-separated — we clean it up automatically.
          </p>
        </Field>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Active
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={loading}
            onClick={() => setActive((v) => !v)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: active ? 'var(--primary)' : 'var(--border)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150"
              style={{
                transform: active ? 'translateX(22px)' : 'translateX(4px)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
              }}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Pause routing
            </span>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Holiday or leave — stops new leads without removing the rep.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={routingPaused}
            disabled={loading}
            onClick={() => setRoutingPaused((v) => !v)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: routingPaused ? 'var(--destructive)' : 'var(--border)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150"
              style={{
                transform: routingPaused ? 'translateX(22px)' : 'translateX(4px)',
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
            Part-time share vs. other reps on the same zip. A sole rep on a zip always gets 100%.
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
