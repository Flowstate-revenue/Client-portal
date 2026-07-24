'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import type { Client } from '@/types/supabase'

interface ClientSearchProps {
  clients: Client[]
  /** Icon-only mode for the collapsed sidebar. */
  collapsed?: boolean
  /** Fired when the collapsed icon is clicked, so the parent can expand the sidebar. */
  onRequestExpand?: () => void
  /** True right after the sidebar was expanded from the collapsed search icon -- focuses the input once. */
  autoFocus?: boolean
  onAutoFocused?: () => void
}

// Admin-only "view as client" control. Replaces the old <select> dropdown
// with a typeahead search -- the client list will keep growing, and a
// dropdown with hundreds of company names doesn't scale. Selection still
// lives only in the ?client_id= URL param (unchanged contract with
// Sidebar's NavLinks and every page.tsx that reads searchParams).
export default function ClientSearch({
  clients,
  collapsed,
  onRequestExpand,
  autoFocus,
  onAutoFocused,
}: ClientSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentClientId = searchParams?.get('client_id') || ''
  const selectedClient = clients.find((c) => c.id === currentClientId) || null

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.company_name.toLowerCase().includes(q))
  }, [clients, query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!autoFocus || collapsed) return
    inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time UI reaction to the sidebar expanding from the collapsed search icon, not derived render state
    setIsOpen(true)
    onAutoFocused?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, collapsed])

  const selectClient = (clientId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (clientId) {
      params.set('client_id', clientId)
    } else {
      params.delete('client_id')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname || '/dashboard')
    setIsOpen(false)
    setQuery('')
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onRequestExpand?.()}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
        title="View as client"
        aria-label="View as client"
      >
        <Search size={18} />
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : selectedClient?.company_name || ''}
          placeholder="View as client..."
          onFocus={() => {
            setIsOpen(true)
            setQuery('')
          }}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-sm bg-background border border-border text-foreground rounded-lg pl-8 pr-7 py-1.5 placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-sidebar"
        />
        {selectedClient && !isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              selectClient('')
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground cursor-pointer"
            aria-label="Clear client filter"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg z-50 py-1">
          <button
            type="button"
            onClick={() => selectClient('')}
            className={`flex w-full items-center px-3 py-1.5 text-sm text-left cursor-pointer transition-colors duration-150 ${
              !currentClientId ? 'text-primary font-medium' : 'text-foreground hover:bg-muted'
            }`}
          >
            All clients
          </button>
          {results.length === 0 ? (
            <div className="px-3 py-1.5 text-sm text-muted-foreground">No matches</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectClient(c.id)}
                className={`flex w-full items-center px-3 py-1.5 text-sm text-left cursor-pointer transition-colors duration-150 ${
                  c.id === currentClientId ? 'text-primary font-medium' : 'text-foreground hover:bg-muted'
                }`}
              >
                {c.company_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
