'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { TeamMember } from '@/types/supabase'

interface EditSelfModalProps {
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

// Every portal user -- owner or manager -- edits their OWN name/phone
// here, and only here. Role and scopes are owner/authorized-manager
// territory (EditScopeModal); this modal never touches them.
export default function EditSelfModal({ member, onSaved, onClose }: EditSelfModalProps) {
  const [fullName, setFullName] = useState(member.full_name ?? '')
  const [phone, setPhone] = useState(member.phone ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('Name is required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/team/update-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save your changes.')

      onSaved({ ...member, full_name: fullName.trim(), phone: phone.trim() })
      toast.success('Your details were updated.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your changes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Edit your details
      </h2>

      <form className="space-y-4" onSubmit={handleSave}>
        <Field label="Name">
          <input className={inputClass} style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} autoFocus />
        </Field>

        <Field label="Email">
          <input className={inputClass} style={{ ...inputStyle, color: 'var(--subtle)', cursor: 'not-allowed' }} value={member.email} readOnly />
          <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
            Email is your login identity and can&apos;t be changed here.
          </p>
        </Field>

        <Field label="Phone">
          <input className={inputClass} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
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
