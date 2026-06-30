'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, LogOut, Menu } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Client, PortalUser } from '@/types/supabase'

interface TopBarProps {
  portalUser: PortalUser | null
  clients: Client[]
  onMenuClick?: () => void
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer transition-colors duration-150"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export function ClientDropdown({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const currentClientId = searchParams?.get('client_id') || ''

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (val) {
      params.set('client_id', val)
    } else {
      params.delete('client_id')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">View as client:</span>
      <select
        value={currentClientId}
        onChange={handleChange}
        className="text-sm bg-card border border-border text-foreground rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
      >
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.company_name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function TopBar({ portalUser, clients, onMenuClick }: TopBarProps) {
  const router = useRouter()

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
    <header
      className="flex items-center justify-between px-6 h-14 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30"
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center p-2 border border-border bg-card text-foreground rounded-lg md:hidden cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu size={18} />
          </button>
        )}
        {portalUser?.role === 'admin' && clients.length > 0 && (
          <Suspense fallback={null}>
            <ClientDropdown clients={clients} />
          </Suspense>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {portalUser && (
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="flex flex-col text-right hidden md:flex">
              <span className="text-xs font-semibold text-foreground">
                {portalUser.full_name || 'User'}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                {portalUser.email} ({portalUser.role})
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border border-border bg-card hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors duration-150 cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
