'use client'

import { Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import type { TeamMember } from '@/types/supabase'

interface TeamTableProps {
  members: TeamMember[]
  currentAuthUserId: string | null
  // Whether the person VIEWING this table can manage OTHER people's rows
  // (edit scopes, remove). True for admin, client_owner, and a
  // client_manager whose own can_manage_managers flag is set. Editing
  // one's OWN row (name/phone) is always allowed regardless of this.
  canManageManagers: boolean
  onEditSelf: (member: TeamMember) => void
  onEditScope: (member: TeamMember) => void
  onDelete: (member: TeamMember) => void
}

const TH = 'text-xs font-medium uppercase tracking-wider px-6 py-3'
const thStyle: React.CSSProperties = { color: 'var(--subtle)' }

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'client_owner'
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={
        isOwner
          ? { backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }
          : { backgroundColor: 'var(--popover)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
      }
    >
      {isOwner ? 'Owner' : 'Manager'}
    </span>
  )
}

function ScopeTags({ member }: { member: TeamMember }) {
  if (member.role === 'client_owner') {
    return (
      <span className="text-xs" style={{ color: 'var(--subtle)' }}>
        Full access
      </span>
    )
  }
  const tags: string[] = []
  if (member.can_manage_managers) tags.push('Manages team')
  if (member.can_access_billing) tags.push('Billing access')
  if (tags.length === 0) {
    return (
      <span className="text-xs" style={{ color: 'var(--subtle)' }}>
        Zips & consultants only
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: 'var(--popover)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
        >
          <ShieldCheck size={11} />
          {t}
        </span>
      ))}
    </div>
  )
}

export default function TeamTable({
  members,
  currentAuthUserId,
  canManageManagers,
  onEditSelf,
  onEditScope,
  onDelete,
}: TeamTableProps) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className={`${TH} text-left w-48`} style={thStyle}>Name</th>
            <th className={`${TH} text-left w-56`} style={thStyle}>Email</th>
            <th className={`${TH} text-left w-36`} style={thStyle}>Phone</th>
            <th className={`${TH} text-left w-24`} style={thStyle}>Role</th>
            <th className={`${TH} text-left`} style={thStyle}>Permissions</th>
            <th className={`${TH} text-right w-20`} style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, idx) => {
            const isLast = idx === members.length - 1
            const isSelf = !!currentAuthUserId && m.auth_user_id === currentAuthUserId
            const isOwnerRow = m.role === 'client_owner'
            const showScopeActions = !isSelf && !isOwnerRow && canManageManagers

            return (
              <tr
                key={m.id}
                className="transition-colors duration-150"
                style={isLast ? {} : { borderBottom: '1px solid var(--border)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--popover)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'
                }}
              >
                <td className="px-6 py-3.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {m.full_name || '—'}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--subtle)' }}>
                        (you)
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{m.email}</span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{m.phone || '—'}</span>
                </td>
                <td className="px-6 py-3.5">
                  <RoleBadge role={m.role} />
                </td>
                <td className="px-6 py-3.5">
                  <ScopeTags member={m} />
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {isSelf && (
                      <ActionButton icon={Pencil} hoverColor="var(--primary)" onClick={() => onEditSelf(m)} title="Edit your details" />
                    )}
                    {showScopeActions && (
                      <>
                        <ActionButton icon={ShieldCheck} hoverColor="var(--primary)" onClick={() => onEditScope(m)} title="Edit permissions" />
                        <ActionButton icon={Trash2} hoverColor="var(--destructive)" onClick={() => onDelete(m)} title="Remove manager" />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ElementType
  hoverColor: string
  onClick: () => void
  title: string
}

function ActionButton({ icon: Icon, hoverColor, onClick, title }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md transition-colors duration-150 cursor-pointer"
      style={{ color: 'var(--subtle)', backgroundColor: 'transparent' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.color = hoverColor
        el.style.backgroundColor = 'var(--border)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.color = 'var(--subtle)'
        el.style.backgroundColor = 'transparent'
      }}
    >
      <Icon size={16} />
    </button>
  )
}
