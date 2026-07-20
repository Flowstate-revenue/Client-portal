'use client'

import { useState } from 'react'
import { Save, User, MapPin, Users, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { ClientProfile, TeamMember } from '@/types/supabase'
import Button from '@/components/ui/Button'
import TeamTable from '@/components/team/TeamTable'
import AddManagerModal from '@/components/team/AddManagerModal'
import EditSelfModal from '@/components/team/EditSelfModal'
import EditManagerModal from '@/components/team/EditManagerModal'
import RemoveManagerModal from '@/components/team/RemoveManagerModal'

// Billing (Manage Billing modal, outcome Turn On/Off) lives on the
// Billing page now, not here -- this page is purely company/address
// profile editing, plus Team (owner + managers) below it.
// See components/billing/ManageBillingModal.tsx.
interface MyAccountClientProps {
  client: ClientProfile
  teamMembers: TeamMember[]
  currentAuthUserId: string
  canManageTeam: boolean
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

// Owner first, then managers by join date -- the server query sorts by
// role text (which puts 'client_manager' before 'client_owner'
// alphabetically), so re-sort here for the order that actually matches
// how the roster should read.
function sortMembers(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'client_owner' ? -1 : 1
    return a.created_at.localeCompare(b.created_at)
  })
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

export default function MyAccountClient({
  client,
  teamMembers: initialTeamMembers,
  currentAuthUserId,
  canManageTeam,
}: MyAccountClientProps) {
  const router = useRouter()
  const [form, setForm] = useState<ProfileForm>(() => toForm(client))
  const [saving, setSaving] = useState(false)

  const [members, setMembers] = useState<TeamMember[]>(() => sortMembers(initialTeamMembers))
  const [adding, setAdding] = useState(false)
  const [editingSelf, setEditingSelf] = useState<TeamMember | null>(null)
  const [editingManager, setEditingManager] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState<TeamMember | null>(null)

  // Re-sync from the server after router.refresh() (used after a
  // successful invite, since the invite response doesn't include the new
  // row) -- adjusted during render rather than in an effect, per React's
  // guidance on syncing state to a prop change without an extra render
  // pass. Edits/removals below update `members` directly without
  // changing `initialTeamMembers`, so they're untouched by this.
  const [prevInitialTeamMembers, setPrevInitialTeamMembers] = useState(initialTeamMembers)
  if (initialTeamMembers !== prevInitialTeamMembers) {
    setPrevInitialTeamMembers(initialTeamMembers)
    setMembers(sortMembers(initialTeamMembers))
  }

  async function confirmRemove() {
    if (!removing) return
    const target = removing
    setRemoving(null)
    // optimistic removal, roll back on failure
    setMembers((prev) => prev.filter((m) => m.id !== target.id))
    try {
      const res = await fetch('/api/team/remove-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal_user_id: target.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not remove this manager.')
      toast.success(`${target.full_name || target.email} removed.`)
    } catch (err) {
      setMembers((prev) => [...prev, target])
      toast.error(err instanceof Error ? err.message : 'Could not remove this manager.')
    }
  }

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

  const inputClass =
    'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
  const labelClass = 'text-xs font-semibold text-muted-foreground mb-1 block'

  return (
    // Cards go full width (Team's table needs the room, and it looks odd
    // for one card to be narrower than the one below it). Input fields
    // inside Company & Contact are capped separately below, so a "Company
    // Name" box doesn't stretch edge-to-edge on wide monitors -- pb-16
    // gives real breathing room below the last card instead of the page
    // ending abruptly.
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your company details, address, and billing.
        </p>
      </div>

      {/* Profile section */}
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <User size={16} className="text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Company & Contact
          </span>
        </div>

        {/* max-w-2xl keeps individual inputs at a normal, readable width --
            without it, a "Company Name" box would stretch the full width
            of the now-full-width card, which looks wrong. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
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

      {/* Team section -- owner first, then managers. Every manager can add,
          edit, and delete zip codes and consultants (that's on the
          Consultants page, unaffected by anything here). A Super Manager
          has full access -- same as the owner except removing the owner --
          a regular manager is consultants-only. */}
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team
            </span>
          </div>
          {canManageTeam && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus size={16} />
              <span>Add manager</span>
            </Button>
          )}
        </div>

        <TeamTable
          members={members}
          currentAuthUserId={currentAuthUserId}
          canManageTeam={canManageTeam}
          onEditSelf={setEditingSelf}
          onEditManager={setEditingManager}
          onDelete={setRemoving}
        />
      </div>

      {adding && (
        <AddManagerModal
          clientId={client.id}
          onAdded={() => router.refresh()}
          onClose={() => setAdding(false)}
        />
      )}
      {editingSelf && (
        <EditSelfModal
          member={editingSelf}
          onSaved={(updated) => setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))}
          onClose={() => setEditingSelf(null)}
        />
      )}
      {editingManager && (
        <EditManagerModal
          member={editingManager}
          onSaved={(updated) => setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))}
          onClose={() => setEditingManager(null)}
        />
      )}
      {removing && (
        <RemoveManagerModal member={removing} onConfirm={confirmRemove} onClose={() => setRemoving(null)} />
      )}
    </div>
  )
}
