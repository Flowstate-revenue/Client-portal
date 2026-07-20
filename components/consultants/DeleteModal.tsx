'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, Shuffle, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Consultant } from '@/types/consultant'

interface DeleteModalProps {
  consultant: Consultant
  // other active consultants who could inherit this rep's zips/leads
  heirs: Consultant[]
  onDeleted: (result: DeleteResult) => void
  onClose: () => void
}

export interface DeleteResult {
  id: string
  name: string
  uncoveredZips: string[]
  zipHeirNames: string[]
  leadAction: 'reassigning' | 'skipped' | 'none'
}

type LeadMode = 'round_robin' | 'heir'
type ZipMode = 'bulk' | 'manual'

export default function DeleteModal({ consultant, heirs, onDeleted, onClose }: DeleteModalProps) {
  const fullName = `${consultant.firstName} ${consultant.lastName}`.trim() || consultant.email
  const hasLeads = !!consultant.ghlUserId

  // preview state — pulled before anything is deleted
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [uncoveredZips, setUncoveredZips] = useState<string[]>([])

  // decisions the manager makes before confirming
  const [zipMode, setZipMode] = useState<ZipMode>('bulk')
  const [zipHeirId, setZipHeirId] = useState<string>('') // bulk mode: one rep for every zip
  const [zipAssignments, setZipAssignments] = useState<Record<string, string>>({}) // manual mode: zip -> repId
  const [reassignLeads, setReassignLeads] = useState(true)
  const [leadMode, setLeadMode] = useState<LeadMode>('round_robin')
  const [leadHeirId, setLeadHeirId] = useState<string>(heirs[0]?.id ?? '')

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadPreview() {
      try {
        const res = await fetch('/api/consultants/preview-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: consultant.id }),
        })
        if (!res.ok) throw new Error(await res.text())
        const json = (await res.json()) as { uncovered_zips?: string[] }
        if (!cancelled) setUncoveredZips(json.uncovered_zips ?? [])
      } catch {
        if (!cancelled) setPreviewFailed(true)
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    }
    loadPreview()
    return () => {
      cancelled = true
    }
  }, [consultant.id])

  async function handleConfirm() {
    if (reassignLeads && hasLeads && leadMode === 'heir' && !leadHeirId) {
      toast.error('Pick a rep to receive their leads, or turn off lead reassignment.')
      return
    }

    setSubmitting(true)
    try {
      // 1. delete — the RPC recomputes uncovered zips at the moment of deletion,
      // which is the source of truth (the preview above can go stale).
      const delRes = await fetch('/api/consultants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: consultant.id }),
      })
      if (!delRes.ok) throw new Error(await delRes.text())
      const delJson = (await delRes.json()) as { uncovered_zips?: string[] }
      const freshUncovered = delJson.uncovered_zips ?? []

      // 2. zip reassignment — build a zip -> heirId map from whichever mode the
      // manager used, then apply it one heir at a time (each call merges into
      // that heir's existing zip_codes via the update RPC).
      const assignments: Record<string, string> =
        zipMode === 'bulk'
          ? zipHeirId
            ? Object.fromEntries(consultant.zipCodes.map((z) => [z, zipHeirId]))
            : {}
          : zipAssignments

      const grouped = new Map<string, string[]>()
      for (const [zip, heirId] of Object.entries(assignments)) {
        if (!heirId) continue
        if (!grouped.has(heirId)) grouped.set(heirId, [])
        grouped.get(heirId)!.push(zip)
      }

      const zipHeirNames: string[] = []
      for (const [heirId, zips] of grouped) {
        const heir = heirs.find((h) => h.id === heirId)
        if (!heir) continue
        const mergedZips = Array.from(new Set([...heir.zipCodes, ...zips]))
        const updRes = await fetch('/api/consultants/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: heir.id,
            first_name: heir.firstName,
            last_name: heir.lastName,
            phone: heir.phone,
            active: heir.active,
            routing_paused: heir.routingPaused,
            routing_weight: heir.routingWeight,
            zip_codes: mergedZips,
          }),
        })
        if (updRes.ok) {
          zipHeirNames.push(`${heir.firstName} ${heir.lastName}`.trim() || heir.email)
        } else {
          toast.error(`Removed ${fullName}, but couldn't hand ${zips.length > 1 ? 'some zips' : 'a zip'} off to ${heir.firstName} — reassign from Recently deleted.`)
        }
      }

      const reassignedZips = new Set(Object.keys(assignments).filter((z) => assignments[z]))
      const stillUncovered = freshUncovered.filter((z) => !reassignedZips.has(z))

      // 3. lead reassignment, if requested and the rep was ever provisioned
      let leadAction: DeleteResult['leadAction'] = 'none'
      if (hasLeads) {
        if (reassignLeads) {
          try {
            const reRes = await fetch('/api/consultants/reassign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: consultant.id,
                mode: leadMode,
                heir_id: leadMode === 'heir' ? leadHeirId : undefined,
              }),
            })
            if (!reRes.ok) throw new Error(await reRes.text())
            leadAction = 'reassigning'
          } catch {
            leadAction = 'skipped'
            toast.error(`Removed ${fullName}, but lead reassignment failed to start — retry from Recently deleted.`)
          }
        } else {
          leadAction = 'skipped'
        }
      }

      onDeleted({
        id: consultant.id,
        name: fullName,
        uncoveredZips: stillUncovered,
        zipHeirNames,
        leadAction,
      })
      onClose()
    } catch {
      toast.error('Could not remove this consultant. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Delete {fullName}?
      </h2>

      {/* What happens */}
      <div
        className="rounded-lg p-4 mb-4 text-sm leading-relaxed"
        style={{
          backgroundColor: 'var(--popover)',
          border: '1px solid var(--border)',
          color: 'var(--muted-foreground)',
        }}
      >
        <p className="mb-2">Deleting this consultant will:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Stop <strong style={{ color: 'var(--foreground)' }}>{fullName}</strong> from receiving new
            leads immediately
          </li>
          <li>Free up their zip codes so other reps can be assigned to them</li>
          <li>Keep their record so you can review coverage gaps afterward</li>
        </ol>
      </div>

      {loadingPreview ? (
        <div
          className="flex items-center gap-2 rounded-lg p-4 mb-4 text-sm"
          style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          <Loader2 className="animate-spin" size={15} />
          Checking zip coverage and lead status…
        </div>
      ) : (
        <>
          {/* Zip coverage impact */}
          <div
            className="rounded-lg p-4 mb-4 text-sm"
            style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)' }}
          >
            {previewFailed ? (
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Couldn&apos;t check zip coverage in advance — you&apos;ll see any gaps under Recently
                deleted after you confirm.
              </p>
            ) : consultant.zipCodes.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)' }}>This rep has no zip codes assigned.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                    Reassign {consultant.zipCodes.length} zip{consultant.zipCodes.length > 1 ? 's' : ''}
                  </p>
                  {uncoveredZips.length > 0 && (
                    <span className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: '#FCD34D' }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                      {uncoveredZips.length} would go uncovered
                    </span>
                  )}
                </div>
                {uncoveredZips.length === 0 && (
                  <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
                    All of these are already covered by other reps — reassigning is optional.
                  </p>
                )}

                <label
                  className="flex items-center gap-2 mt-2 mb-3 text-xs cursor-pointer select-none"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <input
                    type="checkbox"
                    checked={zipMode === 'manual'}
                    onChange={(e) => setZipMode(e.target.checked ? 'manual' : 'bulk')}
                    disabled={submitting}
                  />
                  Assign zips individually
                </label>

                {zipMode === 'bulk' ? (
                  <select
                    value={zipHeirId}
                    onChange={(e) => setZipHeirId(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    <option value="">Leave as-is — don&apos;t reassign</option>
                    {heirs.map((h) => (
                      <option key={h.id} value={h.id}>
                        Assign all to {`${h.firstName} ${h.lastName}`.trim() || h.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {consultant.zipCodes.map((zip) => {
                      const isUncovered = uncoveredZips.includes(zip)
                      return (
                        <div
                          key={zip}
                          className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          <span className="flex items-center gap-1.5 font-mono text-xs" style={{ color: 'var(--foreground)' }}>
                            {zip}
                            {isUncovered && <AlertTriangle size={11} style={{ color: '#FCD34D', flexShrink: 0 }} />}
                          </span>
                          <select
                            value={zipAssignments[zip] ?? ''}
                            onChange={(e) =>
                              setZipAssignments((prev) => ({ ...prev, [zip]: e.target.value }))
                            }
                            disabled={submitting}
                            className="text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                          >
                            <option value="">{isUncovered ? 'Leave uncovered' : 'No change'}</option>
                            {heirs.map((h) => (
                              <option key={h.id} value={h.id}>
                                {`${h.firstName} ${h.lastName}`.trim() || h.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Lead reassignment impact */}
          {hasLeads && (
            <div
              className="rounded-lg p-4 mb-5 text-sm"
              style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                  Reassign their open leads
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reassignLeads}
                  disabled={submitting}
                  onClick={() => setReassignLeads((v) => !v)}
                  className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: reassignLeads ? 'var(--primary)' : 'var(--border)' }}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150"
                    style={{ transform: reassignLeads ? 'translateX(18px)' : 'translateX(3px)' }}
                  />
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
                {reassignLeads
                  ? "Only their open opportunities move. Closed deals stay on their record for history."
                  : 'Their open opportunities stay assigned to them until you reassign from Recently deleted.'}
              </p>

              {reassignLeads && (
                <div className="flex flex-col gap-2">
                  <ModeCard
                    active={leadMode === 'round_robin'}
                    onClick={() => setLeadMode('round_robin')}
                    icon={<Shuffle size={14} />}
                    title="Round-robin by zip"
                    subtitle="Each lead re-routed by its zip, same as new leads."
                  />
                  <ModeCard
                    active={leadMode === 'heir'}
                    onClick={() => setLeadMode('heir')}
                    icon={<UserCheck size={14} />}
                    title="Send all to one rep"
                    subtitle="Every open lead goes to a single rep you choose."
                  />
                  {leadMode === 'heir' && (
                    <select
                      value={leadHeirId}
                      onChange={(e) => setLeadHeirId(e.target.value)}
                      disabled={submitting || heirs.length === 0}
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    >
                      {heirs.length === 0 ? (
                        <option value="">No other active reps available</option>
                      ) : (
                        heirs.map((h) => (
                          <option key={h.id} value={h.id}>
                            {`${h.firstName} ${h.lastName}`.trim() || h.email}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel — Go Back
        </Button>
        <Button type="button" variant="destructive" onClick={handleConfirm} disabled={submitting || loadingPreview}>
          {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Delete'}
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
      className="flex items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors cursor-pointer"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'var(--background)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      }}
    >
      <span style={{ color: active ? 'var(--primary)' : 'var(--muted-foreground)', marginTop: 2 }}>{icon}</span>
      <span>
        <span className="block text-xs font-medium" style={{ color: 'var(--foreground)' }}>
          {title}
        </span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
          {subtitle}
        </span>
      </span>
    </button>
  )
}
