'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { TeamMember } from '@/types/supabase'

interface EditScopeModalProps {
  member: TeamMember
  onSaved: (updated: TeamMember) => void
  onClose: () => void
}

export default function EditScopeModal({ member, onSaved, onClose }: EditScopeModalProps) {
  const [canManageManagers, setCanManageManagers] = useState(member.can_manage_managers)
  const [canAccessBilling, setCanAccessBilling] = useState(member.can_access_billing)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/team/update-manager-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal_user_id: member.id,
          can_manage_managers: canManageManagers,
          can_access_billing: canAccessBilling,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save permissions.')

      onSaved({ ...member, can_manage_managers: canManageManagers, can_access_billing: canAccessBilling })
      toast.success('Permissions updated.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save permissions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-1 pr-6" style={{ color: 'var(--foreground)' }}>
        Permissions for {member.full_name || member.email}
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--subtle)' }}>
        Every manager can add, edit, and delete zip codes and consultants. These two are optional extras.
      </p>

      <form className="space-y-3" onSubmit={handleSave}>
        <ScopeToggle
          label="Can manage other managers"
          description="Add, remove, and edit permissions for other managers on this account."
          checked={canManageManagers}
          onChange={setCanManageManagers}
          disabled={loading}
        />
        <ScopeToggle
          label="Billing access"
          description="View and manage payment method, and turn products on/off."
          checked={canAccessBilling}
          onChange={setCanAccessBilling}
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
