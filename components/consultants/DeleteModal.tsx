'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import type { Consultant } from '@/types/consultant'

// Mock coverage data — replace with real data when Supabase lands
const COVERED_ZIPS: Record<string, string> = {
  '78701': 'Rosa Mendez',
  '78702': 'Rosa Mendez',
}

interface DeleteModalProps {
  consultant: Consultant
  onConfirm: () => void
  onClose: () => void
}

export default function DeleteModal({ consultant, onConfirm, onClose }: DeleteModalProps) {
  const fullName = `${consultant.firstName} ${consultant.lastName}`

  const coveredZips = consultant.zipCodes.filter((z) => z in COVERED_ZIPS)
  const uncoveredZips = consultant.zipCodes.filter((z) => !(z in COVERED_ZIPS))

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Delete {fullName}?
      </h2>

      {/* Warning block */}
      <div
        className="rounded-lg p-4 mb-4 text-sm leading-relaxed"
        style={{
          backgroundColor: 'var(--popover)',
          border: '1px solid var(--border)',
          color: 'var(--muted-foreground)',
        }}
      >
        <p className="mb-2">Deleting this consultant will trigger the following:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            All leads assigned to <strong style={{ color: 'var(--foreground)' }}>{fullName}</strong> will be
            tagged &ldquo;reassign&rdquo; in GHL
          </li>
          <li>
            <strong style={{ color: 'var(--foreground)' }}>{fullName}</strong>&apos;s GHL user account will be
            removed
          </li>
          <li>Tagged leads will be re-matched to consultants by zip code</li>
          <li>Leads with no match will be routed to the support queue</li>
        </ol>
      </div>

      {/* Zip coverage */}
      <div className="flex flex-col gap-2 mb-5">
        {uncoveredZips.length > 0 && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#FCD34D',
            }}
          >
            <p className="font-medium mb-1.5">No backup coverage:</p>
            <ul className="space-y-1">
              {uncoveredZips.map((zip) => (
                <li key={zip} className="flex items-center gap-2">
                  <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                  <span className="font-mono">{zip}</span>
                  <span style={{ color: '#FCD34D' }}>— no backup consultant</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {coveredZips.length > 0 && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#6EE7B7',
            }}
          >
            <p className="font-medium mb-1.5">Covered by another consultant:</p>
            <ul className="space-y-1">
              {coveredZips.map((zip) => (
                <li key={zip} className="flex items-center gap-2">
                  <CheckCircle size={12} style={{ flexShrink: 0 }} />
                  <span className="font-mono">{zip}</span>
                  <span style={{ color: '#34D399' }}>
                    — covered by {COVERED_ZIPS[zip]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel — Go Back
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          Confirm Delete
        </Button>
      </div>
    </Modal>
  )
}
