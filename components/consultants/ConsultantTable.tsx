'use client'

import { Check, Pencil, Trash2 } from 'lucide-react'
import type { Consultant } from '@/types/consultant'
import ZipTag from '@/components/ui/ZipTag'
import StatusBadge from '@/components/ui/StatusBadge'

interface ConsultantTableProps {
  consultants: Consultant[]
  onEdit: (consultant: Consultant) => void
  onDelete: (consultant: Consultant) => void
}

const TH = 'text-xs font-medium uppercase tracking-wider px-6 py-3'
const thStyle: React.CSSProperties = { color: 'var(--subtle)' }

function TerritoryCell({ zipCodes }: { zipCodes: string[] }) {
  const MAX_VISIBLE = 3
  const visible = zipCodes.slice(0, MAX_VISIBLE)
  const overflow = zipCodes.length - MAX_VISIBLE

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((zip) => (
        <ZipTag key={zip} zip={zip} />
      ))}
      {overflow > 0 && (
        <span className="text-xs px-1 py-0.5" style={{ color: 'var(--subtle)' }}>
          +{overflow} more
        </span>
      )}
    </div>
  )
}

export default function ConsultantTable({
  consultants,
  onEdit,
  onDelete,
}: ConsultantTableProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className={`${TH} text-left w-48`} style={thStyle}>
              Name
            </th>
            <th className={`${TH} text-left w-56`} style={thStyle}>
              Email
            </th>
            <th className={`${TH} text-left w-36`} style={thStyle}>
              Phone
            </th>
            <th className={`${TH} text-left`} style={thStyle}>
              Territory
            </th>
            <th className={`${TH} text-center w-20`} style={thStyle}>
              Spanish
            </th>
            <th className={`${TH} text-center w-24`} style={thStyle}>
              GHL Sync
            </th>
            <th className={`${TH} text-right w-20`} style={thStyle}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {consultants.map((c, idx) => {
            const isLast = idx === consultants.length - 1
            return (
              <tr
                key={c.id}
                className="transition-colors duration-150 group"
                style={
                  isLast
                    ? {}
                    : { borderBottom: '1px solid var(--border)' }
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--popover)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'
                }}
              >
                {/* Name */}
                <td className="px-6 py-3.5">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {c.firstName} {c.lastName}
                  </span>
                </td>

                {/* Email */}
                <td className="px-6 py-3.5">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {c.email}
                  </span>
                </td>

                {/* Phone */}
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {c.phone}
                  </span>
                </td>

                {/* Territory */}
                <td className="px-6 py-3.5">
                  <TerritoryCell zipCodes={c.zipCodes} />
                </td>

                {/* Spanish */}
                <td className="px-6 py-3.5 text-center">
                  {c.spanishSpeaker ? (
                    <Check size={16} style={{ color: 'var(--success)', margin: '0 auto' }} />
                  ) : (
                    <span style={{ color: 'var(--subtle)' }}>—</span>
                  )}
                </td>

                {/* GHL Sync */}
                <td className="px-6 py-3.5 text-center">
                  <StatusBadge status={c.ghlSyncStatus} />
                </td>

                {/* Actions */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <ActionButton
                      icon={Pencil}
                      hoverColor="var(--primary)"
                      onClick={() => onEdit(c)}
                      title="Edit consultant"
                    />
                    <ActionButton
                      icon={Trash2}
                      hoverColor="var(--destructive)"
                      onClick={() => onDelete(c)}
                      title="Delete consultant"
                    />
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
