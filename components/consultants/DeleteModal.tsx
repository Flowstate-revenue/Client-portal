'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Consultant } from '@/types/consultant'

interface DeleteModalProps {
  consultant: Consultant
  onConfirm: () => void
  onClose: () => void
}

export default function DeleteModal({ consultant, onConfirm, onClose }: DeleteModalProps) {
  const fullName = `${consultant.firstName} ${consultant.lastName}`

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Delete {fullName}?
      </h2>

      {/* Warning block */}
      <div
        className="rounded-lg p-4 mb-5 text-sm leading-relaxed"
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
          <li>
            Flag any zip they were the only rep for — you&apos;ll see the gaps to reassign under{' '}
            <strong style={{ color: 'var(--foreground)' }}>Recently deleted</strong>
          </li>
        </ol>
        <p className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
          Their record is kept so you can review coverage gaps afterward.
        </p>
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
