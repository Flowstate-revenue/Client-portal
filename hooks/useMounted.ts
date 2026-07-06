'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only after the first client render. Use to gate theme-dependent
 * UI (next-themes) so the SSR and client markup match and avoid hydration
 * mismatches. Centralized so the one necessary setState-in-effect lives behind
 * a single, documented lint exception.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  return mounted
}
