'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { TeamMember } from '@/types/supabase'

interface RemoveManagerModalProps {
  member: TeamMember
  onConfirm: () => void
  onClose: () => void
}

export default function RemoveManagerModal({ member, onConfirm, onClose }: RemoveManagerModalProps) {
  const name = member.full_name || member.email

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-6" style={{ color: 'var(--foreground)' }}>
        Remove {name}?
      </h2>

      <div
        className="rounded-lg p-4 mb-5 text-sm leading-relaxed"
        style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
      >
        <p>
          <strong style={{ color: 'var(--foreground)' }}>{name}</strong> will immediately lose access to this
          portal — they won&apos;t be able to sign in or manage zip codes and consultants. Their email can be
          re-invited later if needed.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel — Go Back
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          Confirm Remove
        </Button>
      </div>
    </Modal>
  )
}
