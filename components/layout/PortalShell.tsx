'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import type { Client, PortalUser } from '@/types/supabase'

interface PortalShellProps {
  children: React.ReactNode
  portalUser: PortalUser | null
  clients: Client[]
  companyName?: string | null
}

const COLLAPSE_STORAGE_KEY = 'fs-sidebar-collapsed'

export default function PortalShell({ children, portalUser, clients, companyName }: PortalShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Persisted collapse state: defaults to expanded (both for first-ever
  // visitors and for SSR, to avoid a hydration mismatch), then syncs from
  // localStorage right after mount -- same "read real value after mount"
  // pattern as useMounted/ThemeToggle elsewhere in this app.
  const [collapsed, setCollapsed] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const [focusClientSearch, setFocusClientSearch] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after mount, same documented exception as useMounted.ts
    if (stored === '1') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  // Clicking the collapsed sidebar's search icon should both expand the
  // sidebar (persisted, same as the arrow) and focus the now-visible input --
  // the arrow toggle alone shouldn't steal focus, so this is kept separate.
  const requestSearchExpand = () => {
    if (collapsed) toggleCollapsed()
    setPeeking(false) // now genuinely expanded -- don't leave a stale peek flag armed
    setFocusClientSearch(true)
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar navigation */}
      <Sidebar
        portalUser={portalUser}
        clients={clients}
        companyName={companyName}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        peeking={peeking}
        onPeekStart={() => setPeeking(true)}
        onPeekEnd={() => setPeeking(false)}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onRequestSearchExpand={requestSearchExpand}
        focusClientSearch={focusClientSearch}
        onClientSearchFocused={() => setFocusClientSearch(false)}
      />

      {/* Main body wrapper. Gutter reflects only the persisted collapsed
          state -- the hover "peek" is a temporary overlay and must not
          reflow content underneath it. */}
      <div className={`flex flex-col flex-1 min-w-0 transition-[padding] duration-200 ease-out ${collapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
