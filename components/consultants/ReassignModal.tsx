'use client'

import { useState } from 'react'
import { Loader2, Shuffle, UserCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Consultant, DeletedConsultant } from '@/types/consultant'

interface ReassignModalProps {
  rep: DeletedConsultant
  heirs: Consultant[]
  onDone: () => void
  onClose: () => void
}

type Mode = 'round_robin' | 'heir'

export default function ReassignModal({ rep, heirs, onDone, onClose }: ReassignModalProps) {
  const [mode, setMode] = useState<Mode>('round_robin')
  const [heirId, setHeirId] = useState<string>(heirs[0]?.id ?? '')
  const [loading, setLoading] = useState(false)

  const repName = `${rep.firstName} ${rep.lastName}`.trim() || rep.email

  async function submit() {
    if (mode === 'heir' && !heirId) {
      toast.error('Pick a rep to receive the leads.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/consultants/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rep.id, mode, heir_id: mode === 'heir' ? heirId : undefined }),
      })
      const json = (await res.json()) as { ok?: boolean; skipped?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Could not start reassignment.')
      if (json.skipped === 'no_ghl_user') {
        toast.info(`${repName} had no active leads to reassign.`)
      } else {
        toast.success(`Reassigning ${repName}'s open opportunities — running in the background.`)
      }
      onDone()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start reassignment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-1 pr-6" style={{ color: 'var(--foreground)' }}>
        Reassign {repName}&apos;s leads
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
        Only their open opportunities move. Closed deals stay on their record for history.
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        <ModeCard
          active={mode === 'round_robin'}
          onClick={() => setMode('round_robin')}
          icon={<Shuffle size={16} />}
          title="Round-robin by zip"
          subtitle="Each lead re-routed by its zip, same as new leads. Leads in an uncovered zip are left for manual handling."
        />
        <ModeCard
          active={mode === 'heir'}
          onClick={() => setMode('heir')}
          icon={<UserCheck size={16} />}
          title="Send all to one rep"
          subtitle="Every open lead goes to a single rep you choose."
        />
      </div>

      {mode === 'round_robin' && rep.uncoveredZips.length > 0 && (
        <div
          className="rounded-md p-2.5 mb-5 text-xs"
          style={{
            backgroundColor: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#FCD34D',
          }}
        >
          <p className="flex items-center gap-1.5 font-medium mb-1">
            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
            {rep.uncoveredZips.length} of their zip{rep.uncoveredZips.length > 1 ? 's have' : ' has'} no
            active rep
          </p>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Leads in {rep.uncoveredZips.length > 1 ? 'those zips' : 'that zip'} can&apos;t be
            round-robined — they&apos;ll stay flagged in Recently deleted until you add a rep or send
            them to one below.
          </p>
        </div>
      )}

      {mode === 'heir' && (
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
            Receiving rep
          </label>
          {heirs.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              No other active reps available — use round-robin or add a rep first.
            </p>
          ) : (
            <select
              value={heirId}
              onChange={(e) => setHeirId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              {heirs.map((h) => (
                <option key={h.id} value={h.id}>
                  {`${h.firstName} ${h.lastName}`.trim() || h.email}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={loading || (mode === 'heir' && heirs.length === 0)}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Reassign leads'}
        </Button>
      </div>
    </Modal>
  )
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg p-3 text-left transition-colors cursor-pointer"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'var(--popover)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      }}
    >
      <span style={{ color: active ? 'var(--primary)' : 'var(--muted-foreground)', marginTop: 2 }}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          {title}
        </span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {subtitle}
        </span>
      </span>
    </button>
  )
}
