'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
  // Optional override for wider content (e.g. the billing modal's 2-up
  // component cards). Defaults to the original max-w-lg so every existing
  // caller (consultant modals, etc.) is unaffected.
  maxWidthClassName?: string
}

export default function Modal({ onClose, children, maxWidthClassName = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClassName} mx-4 rounded-xl p-6 max-h-[85vh] overflow-y-auto`}
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md transition-colors duration-150 cursor-pointer"
          style={{ color: 'var(--subtle)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--subtle)')}
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
