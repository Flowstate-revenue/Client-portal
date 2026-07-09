'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react'
import type { Consultant, DeletedConsultant } from '@/types/consultant'
import ReassignModal from './ReassignModal'

interface RecentlyDeletedModalProps {
  reps: DeletedConsultant[]
  heirs: Consultant[]
  onClose: () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RecentlyDeletedModal({ reps, heirs, onClose }: RecentlyDeletedModalProps) {
  const router = useRouter()
  const [reassigning, setReassigning] = useState<DeletedConsultant | null>(null)

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-1 pr-6" style={{ color: 'var(--foreground)' }}>
        Recently deleted
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
        Deleted reps and any zip codes that no longer have an active rep. Add these zips to another
        consultant to close the gap.
      </p>

      {reps.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center text-sm"
          style={{
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          No recently deleted consultants.
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {reps.map((rep) => (
            <div
              key={rep.id}
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {`${rep.firstName} ${rep.lastName}`.trim() || rep.email}
                </span>
                {rep.deletedAt && (
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--subtle)' }}>
                    Deleted {formatDate(rep.deletedAt)}
                  </span>
                )}
              </div>

              {rep.uncoveredZips.length > 0 ? (
                <div
                  className="rounded-md p-2.5 text-xs"
                  style={{
                    backgroundColor: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#FCD34D',
                  }}
                >
                  <p className="flex items-center gap-1.5 font-medium mb-1.5">
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    {rep.uncoveredZips.length} zip{rep.uncoveredZips.length > 1 ? 's' : ''} now
                    uncovered
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rep.uncoveredZips.map((zip) => (
                      <span
                        key={zip}
                        className="font-mono rounded px-1.5 py-0.5"
                        style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}
                      >
                        {zip}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                  All of their zip codes are still covered by other reps.
                </p>
              )}

              {/* Lead reassignment (open opportunities in the automation system) */}
              <div
                className="flex items-center justify-between gap-3 mt-3 pt-3"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {rep.leadsReassignedAt ? (
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <CheckCircle2 size={13} style={{ color: '#34D399' }} />
                    Reassignment requested {formatDate(rep.leadsReassignedAt)}
                  </span>
                ) : rep.hasGhlUser ? (
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                    Their open opportunities are still assigned to them.
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                    No active leads to reassign.
                  </span>
                )}

                {rep.hasGhlUser && (
                  <button
                    type="button"
                    onClick={() => setReassigning(rep)}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                    style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  >
                    <Users size={13} />
                    {rep.leadsReassignedAt ? 'Reassign again' : 'Reassign leads'}
                  </button>
                )}
              </div>

              {/* Access status — access is pulled automatically once reassignment finishes */}
              {rep.hasGhlUser && (
                <div className="mt-2 text-xs">
                  {rep.ghlAccessRevokedAt ? (
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
                      <CheckCircle2 size={13} style={{ color: '#34D399' }} />
                      Access removed {formatDate(rep.ghlAccessRevokedAt)}
                    </span>
                  ) : rep.leadsReassignedAt ? (
                    <span style={{ color: 'var(--subtle)' }}>
                      Access is removed automatically once reassignment finishes.
                    </span>
                  ) : (
                    <span style={{ color: 'var(--subtle)' }}>
                      Access stays until their leads are reassigned.
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-5">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      {reassigning && (
        <ReassignModal
          rep={reassigning}
          heirs={heirs}
          onDone={() => router.refresh()}
          onClose={() => setReassigning(null)}
        />
      )}
    </Modal>
  )
}
