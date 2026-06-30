'use client'

import Modal from '@/components/ui/Modal'
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
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: '#F8F9FA' }}>
        Delete {fullName}?
      </h2>

      {/* Warning block */}
      <div
        className="rounded-lg p-4 mb-4 text-sm leading-relaxed"
        style={{
          backgroundColor: '#161820',
          border: '1px solid #1E2130',
          color: '#9CA3AF',
        }}
      >
        <p className="mb-2">Deleting this consultant will trigger the following:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            All leads assigned to <strong style={{ color: '#F8F9FA' }}>{fullName}</strong> will be
            tagged &ldquo;reassign&rdquo; in GHL
          </li>
          <li>
            <strong style={{ color: '#F8F9FA' }}>{fullName}</strong>&apos;s GHL user account will be
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
              backgroundColor: 'rgba(120,53,15,0.4)',
              border: '1px solid rgba(146,64,14,0.3)',
              color: '#FCD34D',
            }}
          >
            <p className="font-medium mb-1.5">No backup coverage:</p>
            <ul className="space-y-1">
              {uncoveredZips.map((zip) => (
                <li key={zip} className="flex items-center gap-2">
                  <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                  <span className="font-mono">{zip}</span>
                  <span style={{ color: '#D97706' }}>— no backup consultant</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {coveredZips.length > 0 && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor: 'rgba(6,78,59,0.4)',
              border: '1px solid rgba(6,95,70,0.3)',
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
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm transition-colors duration-150 cursor-pointer"
          style={{
            border: '1px solid #1E2130',
            color: '#9CA3AF',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#F59E0B'
            e.currentTarget.style.color = '#F8F9FA'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1E2130'
            e.currentTarget.style.color = '#9CA3AF'
          }}
        >
          Cancel — Go Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer"
          style={{ backgroundColor: '#DC2626', color: '#ffffff' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
        >
          Confirm Delete
        </button>
      </div>
    </Modal>
  )
}
