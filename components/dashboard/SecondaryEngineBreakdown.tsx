'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { COMPONENT_LIST } from '@/lib/components'
import type { DashboardSummary } from '@/lib/dashboard-metrics'

interface SecondaryEngineBreakdownProps {
  summary: DashboardSummary
}

const COUNT_KEY: Record<string, keyof DashboardSummary> = {
  proposal_followup: 'proposalFollowupsTotal',
  reactivation: 'reactivationsTotal',
  referral: 'referralsTotal',
  review: 'reviewsTotal',
}

// Section C. Sits is the hero component and gets the entire top section above;
// everything else is low-volume at launch and would read as false-equal-
// weight if it sat in its own hero card. Collapsed by default to keep the
// page's headline message ("are we delivering sits, fast") uncluttered --
// the toggle is here for the client who wants to check on the other engines.
export default function SecondaryEngineBreakdown({ summary }: SecondaryEngineBreakdownProps) {
  const [open, setOpen] = useState(false)
  const secondaryComponents = COMPONENT_LIST.filter((c) => c.key !== 'sit')
  const totalSecondary = secondaryComponents.reduce((sum, c) => sum + (Number(summary[COUNT_KEY[c.key]]) || 0), 0)

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-subtle" />
          <span className="text-sm font-medium text-foreground">Secondary Engines</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {totalSecondary} total
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-subtle" /> : <ChevronDown size={16} className="text-subtle" />}
      </button>

      {open && (
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          {secondaryComponents.map((c) => {
            const count = Number(summary[COUNT_KEY[c.key]]) || 0
            return (
              <span
                key={c.key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${c.badge}`}
              >
                {c.labelPlural}
                <span className="tabular-nums">{count}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
