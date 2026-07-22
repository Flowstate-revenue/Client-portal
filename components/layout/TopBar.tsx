'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, LogOut, Menu, User } from 'lucide-react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Client, PortalUser } from '@/types/supabase'
import { useMounted } from '@/hooks/useMounted'

interface TopBarProps {
  portalUser: PortalUser | null
  clients: Client[]
  companyName?: string | null
  onMenuClick?: () => void
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

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

// Icon + "Company / portal user name" block in the top-right, linking to
// My Account. Split out (like ClientDropdown above) because it reads the
// admin's "view as client" selection from ?client_id= via useSearchParams,
// which needs a Suspense boundary.
function AccountLink({
  portalUser,
  clients,
  companyName,
}: {
  portalUser: PortalUser
  clients: Client[]
  companyName?: string | null
}) {
  const searchParams = useSearchParams()
  const clientId = searchParams?.get('client_id')

  const displayCompany =
    portalUser.role === 'admin'
      ? clients.find((c) => c.id === clientId)?.company_name || 'Flowstate'
      : companyName || 'Flowstate'

  const href = clientId ? `/my-account?client_id=${clientId}` : '/my-account'

  return (
    <Link href={href} className="flex items-center gap-3 group">
      <span className="p-2 rounded-lg border border-border bg-card group-hover:bg-muted text-foreground transition-colors duration-150 inline-flex">
        <User size={18} />
      </span>
      <span className="flex-col text-right hidden md:flex">
        <span className="text-xs font-semibold text-foreground">{displayCompany}</span>
        <span className="text-[10px] text-muted-foreground leading-none">
          {portalUser.full_name || 'User'}
        </span>
      </span>
    </Link>
  )
}

export default function TopBar({ portalUser, clients, companyName, onMenuClick }: TopBarProps) {
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
            <Suspense fallback={<div className="w-9 h-9" />}>
              <AccountLink portalUser={portalUser} clients={clients} companyName={companyName} />
            </Suspense>

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
