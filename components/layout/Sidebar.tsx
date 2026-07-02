'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Receipt, Users, X } from 'lucide-react'
import Logo from '@/components/ui/Logo'

const NAV_ITEMS = [
  { label: 'Billing', icon: Receipt, href: '/billing' },
  { label: 'Dashboard', icon: BarChart2, href: '/dashboard' },
  { label: 'Sales Reps', icon: Users, href: '/consultants' },
] as const

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const content = (
    <div className="flex flex-col h-full bg-card border-r border-border w-64">
      <div className="flex items-center px-6 h-14 border-b border-border">
        <Logo variant="wordmark" height={20} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center gap-3">
        <Logo variant="icon" height={32} className="rounded-full" />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">Flowstate Portal</span>
          <span className="text-[10px] text-muted-foreground">v1.0.3</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar (visible on md and up) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-20 w-64 flex-col">
        {content}
      </aside>

      {/* Mobile Sidebar Backdrop & Drawer (visible on mobile when open) */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden bg-background/80 backdrop-blur-sm" onClick={onClose}>
          <div
            className="relative flex w-full max-w-xs flex-1 flex-col bg-card animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
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
