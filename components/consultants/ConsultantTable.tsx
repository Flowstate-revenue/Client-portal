'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { Consultant } from '@/types/consultant'
import ZipTag from '@/components/ui/ZipTag'

interface ConsultantTableProps {
  consultants: Consultant[]
  onEdit: (consultant: Consultant) => void
  onDelete: (consultant: Consultant) => void
  onAvailabilityChange: (c: Consultant, paused: boolean, weight: number) => void
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
  onAvailabilityChange,
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
            <th className={`${TH} text-center w-40`} style={thStyle}>
              Availability
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

                {/* Availability */}
                <td className="px-6 py-3.5">
                  <AvailabilityCell c={c} onChange={onAvailabilityChange} />
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

function AvailabilityCell({
  c,
  onChange,
}: {
  c: Consultant
  onChange: (c: Consultant, paused: boolean, weight: number) => void
}) {
  const presets = [1, 0.75, 0.5, 0.25]
  const weights = presets.includes(c.routingWeight) ? presets : [c.routingWeight, ...presets]
  const active = !c.routingPaused
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => onChange(c, !c.routingPaused, c.routingWeight)}
        title={active ? 'Routing on — click to pause' : 'Paused — click to resume'}
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer"
        style={{ backgroundColor: active ? 'var(--primary)' : 'var(--border)' }}
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150"
          style={{ transform: active ? 'translateX(18px)' : 'translateX(3px)', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
        />
      </button>
      <select
        value={String(c.routingWeight)}
        onChange={(e) => onChange(c, c.routingPaused, Number(e.target.value))}
        disabled={c.routingPaused}
        title="Share of leads routed to this rep"
        className="text-xs rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
      >
        {weights.map((w) => (
          <option key={w} value={w}>
            {Math.round(w * 100)}%
          </option>
        ))}
      </select>
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
