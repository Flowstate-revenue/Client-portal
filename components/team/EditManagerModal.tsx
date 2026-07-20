'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { TeamMember } from '@/types/supabase'

interface EditManagerModalProps {
  member: TeamMember
  onSaved: (updated: TeamMember) => void
  onClose: () => void
}

const inputClass =
  'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0'
const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--background)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

// Owner/super-manager editing ANOTHER manager -- name, phone, and their
// Super Manager status, all in one action. Never opened for your own row
// (use EditSelfModal) or for the owner's row (untouchable by anyone but
// the owner themselves).
export default function EditManagerModal({ member, onSaved, onClose }: EditManagerModalProps) {
  const [fullName, setFullName] = useState(member.full_name ?? '')
  const [phone, setPhone] = useState(member.phone ?? '')
  const [isSuperManager, setIsSuperManager] = useState(member.is_super_manager)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('Name is required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/team/update-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal_user_id: member.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          is_super_manager: isSuperManager,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save changes.')

      onSaved({ ...member, full_name: fullName.trim(), phone: phone.trim(), is_super_manager: isSuperManager })
      toast.success('Manager updated.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Edit {member.full_name || member.email}
      </h2>

      <form className="space-y-4" onSubmit={handleSave}>
        <Field label="Name">
          <input className={inputClass} style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} autoFocus />
        </Field>

        <Field label="Email">
          <input className={inputClass} style={{ ...inputStyle, color: 'var(--subtle)', cursor: 'not-allowed' }} value={member.email} readOnly />
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            Email is their login identity and can&apos;t be changed here.
          </p>
        </Field>

        <Field label="Phone">
          <input className={inputClass} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
        </Field>

        <ScopeToggle
          label="Super Manager"
          description="Full access, same as you: add/edit/remove other managers, billing & subscriptions, and consultants. Off = consultants only."
          checked={isSuperManager}
          onChange={setIsSuperManager}
          disabled={loading}
        />

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
