'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

const ASSETS = {
  icon: { dark: '/icon-dark.png', light: '/icon-light.png' },
  wordmark: { dark: '/logo-dark.png', light: '/logo-light.png' },
} as const

interface LogoProps {
  variant?: keyof typeof ASSETS
  /** Pixel height. Width is automatic to preserve aspect ratio. */
  height?: number
  className?: string
}

/**
 * Renders the Flowstate brand mark, automatically swapping between the
 * dark-colored asset (for light backgrounds) and the light-colored asset
 * (for dark backgrounds) based on the active theme.
 */
export default function Logo({ variant = 'icon', height = 32, className = '' }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div style={{ height }} className={className} />
  }

  // Dark theme -> light-colored asset (reads against dark backgrounds).
  // Light theme -> dark-colored asset (reads against light backgrounds).
  const src = resolvedTheme === 'dark' ? ASSETS[variant].light : ASSETS[variant].dark

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Flowstate" height={height} style={{ height, width: 'auto' }} className={className} />
  )
}
