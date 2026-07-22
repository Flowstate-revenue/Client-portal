'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import type { Client, PortalUser } from '@/types/supabase'

interface PortalShellProps {
  children: React.ReactNode
  portalUser: PortalUser | null
  clients: Client[]
  companyName?: string | null
}

export default function PortalShell({ children, portalUser, clients, companyName }: PortalShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar navigation */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main body wrapper */}
      <div className="flex flex-col flex-1 md:pl-64 min-w-0">
        <TopBar
          portalUser={portalUser}
          clients={clients}
          companyName={companyName}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
