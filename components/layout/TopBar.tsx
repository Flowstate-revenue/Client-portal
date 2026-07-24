'use client'

import { Menu } from 'lucide-react'

interface TopBarProps {
  onMenuClick?: () => void
}

// Mobile-only header. Every control that used to live here (view-as-client
// search, theme toggle, account link, logout) now lives inside the sidebar
// itself (see Sidebar.tsx / SidebarAccountMenu.tsx) -- on mobile those are
// reached by opening the drawer via this hamburger button. Hidden entirely
// on md+ since the desktop sidebar is always visible there.
export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="flex md:hidden items-center px-4 h-14 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center p-2 border border-border bg-card text-foreground rounded-lg cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
    </header>
  )
}
