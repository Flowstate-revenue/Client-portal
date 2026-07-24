'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BarChart2, Receipt, Users, Globe, HelpCircle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import ClientSearch from './ClientSearch'
import SidebarAccountMenu from './SidebarAccountMenu'
import type { Client, PortalUser } from '@/types/supabase'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: BarChart2, href: '/dashboard' },
  { label: 'Billing', icon: Receipt, href: '/billing' },
  { label: 'Consultants', icon: Users, href: '/consultants' },
  { label: 'KB: URLs', icon: Globe, href: '/knowledge-base/urls' },
  { label: 'KB: FAQs', icon: HelpCircle, href: '/knowledge-base/faqs' },
] as const

interface SidebarProps {
  portalUser: PortalUser | null
  clients: Client[]
  companyName?: string | null
  /** Persisted collapse state (arrow-toggled), lifted to PortalShell so it can also size the content gutter. */
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Temporary hover "peek" -- overlays the collapsed rail without shifting page content. */
  peeking: boolean
  onPeekStart: () => void
  onPeekEnd: () => void
  /** Mobile drawer state. */
  isOpen?: boolean
  onClose?: () => void
  /** Fired when the collapsed search icon is clicked (expand + focus, distinct from the plain arrow toggle). */
  onRequestSearchExpand?: () => void
  /** Focus the client search input once, right after it expands from the collapsed icon. */
  focusClientSearch?: boolean
  onClientSearchFocused?: () => void
}

// Split out so useSearchParams() (which requires a Suspense boundary) only
// wraps the part of the sidebar that needs it -- same pattern used by
// ClientSearch and SidebarAccountMenu below.
function NavLinks({ showLabels, onClick }: { showLabels: boolean; onClick?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Admin's "view as client" selection lives only in the ?client_id= URL
  // param -- carry it forward on every nav link so switching pages doesn't
  // silently reset back to "All clients."  No-op for non-admins.
  const clientId = searchParams?.get('client_id')
  const withClientId = (href: string) => (clientId ? `${href}?client_id=${clientId}` : href)

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={withClientId(item.href)}
            onClick={onClick}
            title={showLabels ? undefined : item.label}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
              !showLabels ? 'justify-center' : ''
            } ${
              isActive
                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {showLabels && <span>{item.label}</span>}
          </Link>
        )
      })}
    </>
  )
}

function SidebarContent({
  portalUser,
  clients,
  companyName,
  showLabels,
  showCollapseToggle,
  onToggleCollapsed,
  onNavClick,
  onRequestSearchExpand,
  focusClientSearch,
  onClientSearchFocused,
}: {
  portalUser: PortalUser | null
  clients: Client[]
  companyName?: string | null
  showLabels: boolean
  showCollapseToggle: boolean
  onToggleCollapsed?: () => void
  onNavClick?: () => void
  onRequestSearchExpand?: () => void
  focusClientSearch?: boolean
  onClientSearchFocused?: () => void
}) {
  const isAdmin = portalUser?.role === 'admin' && clients.length > 0

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      {/* Logo + collapse toggle */}
      <div className={`flex items-center h-14 border-b border-border ${showLabels ? 'px-4 justify-between' : 'px-2 justify-center'}`}>
        {showLabels ? (
          <Logo variant="wordmark" height={20} />
        ) : (
          <Logo variant="icon" height={24} />
        )}
        {showCollapseToggle && showLabels && (
          <button
            onClick={onToggleCollapsed}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Admin "view as client" search */}
      {isAdmin && (
        <div className={`border-b border-border ${showLabels ? 'p-3' : 'py-2 flex justify-center'}`}>
          <Suspense fallback={null}>
            <ClientSearch
              clients={clients}
              collapsed={!showLabels}
              onRequestExpand={onRequestSearchExpand}
              autoFocus={focusClientSearch}
              onAutoFocused={onClientSearchFocused}
            />
          </Suspense>
        </div>
      )}

      {/* Expand toggle when collapsed (no room next to the icon logo) */}
      {showCollapseToggle && !showLabels && (
        <div className="flex justify-center py-1">
          <button
            onClick={onToggleCollapsed}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <Suspense fallback={null}>
          <NavLinks showLabels={showLabels} onClick={onNavClick} />
        </Suspense>
      </nav>

      {/* Account */}
      <div className="p-2 border-t border-border">
        {portalUser && (
          <Suspense fallback={<div className="h-12" />}>
            <SidebarAccountMenu
              portalUser={portalUser}
              clients={clients}
              companyName={companyName}
              collapsed={!showLabels}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({
  portalUser,
  clients,
  companyName,
  collapsed,
  onToggleCollapsed,
  peeking,
  onPeekStart,
  onPeekEnd,
  isOpen,
  onClose,
  onRequestSearchExpand,
  focusClientSearch,
  onClientSearchFocused,
}: SidebarProps) {
  // "Visually expanded" = either genuinely expanded, or collapsed-but-peeking
  // on hover. The peek is a temporary overlay (the aside is already
  // `fixed`), so it never reflows the page's content gutter -- only the
  // arrow-toggled `collapsed` state does that (see PortalShell).
  const showLabels = !collapsed || peeking

  return (
    <>
      {/* Desktop Sidebar (visible on md and up) */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-20 flex-col transition-[width] duration-200 ease-out ${
          showLabels ? 'w-64' : 'w-16'
        } ${peeking && collapsed ? 'shadow-2xl' : ''}`}
        onMouseEnter={collapsed ? onPeekStart : undefined}
        onMouseLeave={collapsed ? onPeekEnd : undefined}
      >
        <SidebarContent
          portalUser={portalUser}
          clients={clients}
          companyName={companyName}
          showLabels={showLabels}
          showCollapseToggle
          onToggleCollapsed={onToggleCollapsed}
          onRequestSearchExpand={onRequestSearchExpand}
          focusClientSearch={focusClientSearch}
          onClientSearchFocused={onClientSearchFocused}
        />
      </aside>

      {/* Mobile Sidebar Backdrop & Drawer (visible on mobile when open) -- always full width, no collapse concept on touch */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden bg-background/80 backdrop-blur-sm" onClick={onClose}>
          <div
            className="relative flex w-full max-w-xs flex-1 flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              portalUser={portalUser}
              clients={clients}
              companyName={companyName}
              showLabels
              showCollapseToggle={false}
              onNavClick={onClose}
            />
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-md border border-border bg-card text-foreground cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
