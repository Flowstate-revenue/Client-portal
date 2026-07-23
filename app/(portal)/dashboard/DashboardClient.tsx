'use client'

import { Calendar } from 'lucide-react'
import HeroKpiBar from '@/components/dashboard/HeroKpiBar'
import FunnelSnapshot from '@/components/dashboard/FunnelSnapshot'
import NoShowRescueCard from '@/components/dashboard/NoShowRescueCard'
import SecondaryEngineBreakdown from '@/components/dashboard/SecondaryEngineBreakdown'
import type {
  DashboardSummary,
  WeekPoint,
  FunnelSnapshot as FunnelSnapshotData,
  QualificationShield,
  QualifiedYield,
  SpeedToFirstTouch,
  NoShowRescue,
} from '@/lib/dashboard-metrics'

export type { DashboardSummary, WeekPoint }

export interface DashboardData {
  summary: DashboardSummary
  trend: WeekPoint[]
  funnel: FunnelSnapshotData
  qualification: QualificationShield
  qualifiedYield: QualifiedYield
  speedToFirstTouch: SpeedToFirstTouch
  noShowRescue: NoShowRescue
}

interface DashboardClientProps {
  data: DashboardData
}

// Client-facing "Results" dashboard. Sells the outcome (sits, speed,
// qualification yield) rather than internal GHL mechanics -- see
// Flowstate-Dashboard-Metrics-Reference for the full rationale. Layout:
//   A. Hero KPI bar (4 cards) -- the launch-set metrics, priority 5/4
//   B. Live funnel snapshot + no-show/rescue -- the visual anchor, priority 3
//   C. Secondary engine breakdown -- collapsed, low-volume products
export default function DashboardClient({ data }: DashboardClientProps) {
  const { summary, trend, funnel, qualification, qualifiedYield, speedToFirstTouch, noShowRescue } = data

  return (
    <div className="space-y-6 p-8">
      {/* Title block */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Performance across your follow-up engines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground opacity-60">
            <Calendar size={16} />
            All time
          </div>
        </div>
      </div>

      {/* A. Hero KPI bar */}
      <HeroKpiBar
        summary={summary}
        trend={trend}
        qualifiedYield={qualifiedYield}
        speedToFirstTouch={speedToFirstTouch}
        qualification={qualification}
      />

      {/* B. Funnel (2/3) + No-show/rescue (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FunnelSnapshot funnel={funnel} />
        <NoShowRescueCard data={noShowRescue} />
      </div>

      {/* C. Secondary engine breakdown -- collapsed by default */}
      <SecondaryEngineBreakdown summary={summary} />
    </div>
  )
}
