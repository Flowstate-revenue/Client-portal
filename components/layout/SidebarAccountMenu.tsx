'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { User, Sun, Moon, LogOut } from 'lucide-react'
import type { Client, PortalUser } from '@/types/supabase'
import { useMounted } from '@/hooks/useMounted'

interface SidebarAccountMenuProps {
  portalUser: PortalUser
  clients: Client[]
  companyName?: string | null
  /** Icon-only mode for the collapsed sidebar. */
  collapsed?: boolean
}

// Bottom-of-sidebar account control. Replaces the old static "Flowstate
// Portal / v3.6.0" footer block and consolidates what used to be three
// separate TopBar controls (account link, theme toggle, logout button) into
// one entry point with a flyout submenu -- opens on hover OR click, closes on
// mouse-leave, outside click, or Escape (the last two matter on touch, where
// there's no hover to fall back on).
export default function SidebarAccountMenu({ portalUser, clients, companyName, collapsed }: SidebarAccountMenuProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [open, setOpen] = useState(false)

  // Cancel any pending close (mouse re-entered the trigger or flyout).
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  // Close after a short grace period so the cursor can travel from the
  // trigger, across the gap, and onto the flyout without it vanishing.
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      cancelClose()
    }
  }, [])

  const clientId = searchParams?.get('client_id')
  const displayCompany =
    portalUser.role === 'admin'
      ? clients.find((c) => c.id === clientId)?.company_name || 'Flowstate'
      : companyName || 'Flowstate'
  const myAccountHref = clientId ? `/my-account?client_id=${clientId}` : '/my-account'

  const isDark = mounted && theme === 'dark'

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted transition-colors duration-150 cursor-pointer ${
          collapsed ? 'justify-center' : ''
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground">
          <User size={16} />
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-semibold text-foreground">{displayCompany}</span>
            <span className="truncate text-[10px] text-muted-foreground">{portalUser.full_name || 'User'}</span>
          </span>
        )}
      </button>

      {open && (
        <>
        {/* Transparent bridge spanning the gap between trigger and flyout so
            the cursor can cross without a mouseout closing the menu. */}
        <span aria-hidden className="absolute bottom-0 left-full z-40 h-full w-2" />
        <div
          role="menu"
          className="absolute bottom-0 left-full z-50 ml-2 w-52 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          <Link
            href={myAccountHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-150"
          >
            <User size={16} />
            My Account
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Light theme' : 'Dark theme'}
          </button>

          <div className="my-1 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-150 cursor-pointer"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
        </>
      )}
    </div>
  )
}
