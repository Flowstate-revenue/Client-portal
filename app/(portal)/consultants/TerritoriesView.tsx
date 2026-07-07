'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { TerritoryZip } from '@/types/territory'
import type { Consultant } from '@/types/consultant'
import EditModal from '@/components/consultants/EditModal'

interface Props {
  territories: TerritoryZip[]
  role: string
  activeClientId: string | null
  consultants: Consultant[]
}

const TH = 'text-xs font-medium uppercase tracking-wider px-6 py-3'
const thStyle: React.CSSProperties = { color: 'var(--subtle)' }

export default function TerritoriesView({ territories, role, activeClientId, consultants }: Props) {
  const router = useRouter()
  const byId = useMemo(() => new Map(consultants.map((c) => [c.id, c])), [consultants])
  const [editing, setEditing] = useState<Consultant | null>(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q
    ? territories.filter(
        (t) =>
          t.zip.includes(q) ||
          (t.city ?? '').toLowerCase().includes(q) ||
          (t.state ?? '').toLowerCase().includes(q) ||
          t.reps.some((r) => r.name.toLowerCase().includes(q))
      )
    : territories

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Territories
          </h1>
          <span
            className="rounded-full px-2.5 py-0.5 text-sm"
            style={{ backgroundColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            {filtered.length}
          </span>
        </div>
        <div className="relative">
          <div
            className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
            style={{ color: 'var(--subtle)' }}
          >
            <Search size={16} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search zip, city, or rep"
            className="w-48 sm:w-64 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      {territories.length === 0 ? (
        <EmptyCard>
          {role === 'admin' && !activeClientId
            ? 'Select a client to see their territory coverage.'
            : 'No territories yet — assign zip codes to reps and they’ll appear here.'}
        </EmptyCard>
      ) : filtered.length === 0 ? (
        <EmptyCard>No zips match your search.</EmptyCard>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className={`${TH} text-left w-28`} style={thStyle}>Zip</th>
                <th className={`${TH} text-left w-56`} style={thStyle}>Location</th>
                <th className={`${TH} text-left`} style={thStyle}>Consultants</th>
                <th className={`${TH} text-center w-40`} style={thStyle}>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => {
                const noActive = t.reps.length > 0 && t.reps.every((r) => r.paused)
                const activeCount = t.reps.filter((r) => !r.paused).length
                const isLast = idx === filtered.length - 1
                return (
                  <tr key={t.zip} style={isLast ? {} : { borderBottom: '1px solid var(--border)' }}>
                    <td className="px-6 py-3.5">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--foreground)', fontFamily: 'ui-monospace, monospace' }}
                      >
                        {t.zip}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {t.city ? (
                        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          {t.city}
                          {t.state ? `, ${t.state}` : ''}
                        </span>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--subtle)' }}>—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {t.reps.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            title={`Edit ${r.name}`}
                            onClick={() => {
                              const c = byId.get(r.consultantId)
                              if (c) setEditing(c)
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs cursor-pointer transition-colors duration-150"
                            style={{
                              backgroundColor: 'var(--popover)',
                              border: '1px solid var(--border)',
                              color: r.paused ? 'var(--subtle)' : 'var(--foreground)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border)'
                            }}
                          >
                            <span style={{ textDecoration: r.paused ? 'line-through' : 'none' }}>{r.name}</span>
                            {r.paused ? (
                              <span style={{ color: 'var(--subtle)' }}>· paused</span>
                            ) : (
                              r.sharePct !== 100 && (
                                <span style={{ color: 'var(--muted-foreground)' }}>· {r.sharePct}%</span>
                              )
                            )}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {noActive ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: 'rgba(239,68,68,0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.25)',
                          }}
                        >
                          No active rep
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                          {activeCount} active
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal
          consultant={editing}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-10 text-center text-sm"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
    >
      {children}
    </div>
  )
}
