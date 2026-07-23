'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type FunnelPeriod = 'today' | 'week' | 'month' | 'sixmonth'

export const PERIOD_OPTIONS: { value: FunnelPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'sixmonth', label: '6 Month' },
]

interface PeriodToggleProps {
  active: FunnelPeriod
}

// Small segmented control that drives the funnel card's cohort window via
// the `period` URL param -- server-rendered page.tsx reads it back out and
// re-fetches accordingly, so the toggle works without any client-side data
// fetching of its own (and the selection is shareable/bookmarkable).
export default function PeriodToggle({ active }: PeriodToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setPeriod = (value: FunnelPeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setPeriod(opt.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            opt.value === active
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
