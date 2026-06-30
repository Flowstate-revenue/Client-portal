'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ onClose, children }: ModalProps) {
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
        className="relative w-full max-w-lg mx-4 rounded-xl p-6"
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
