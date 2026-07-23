import { Clock, ShieldCheck, Target } from 'lucide-react'
import { KpiCard, CardLabel, TrendBadge, Sparkline } from './KpiCard'
import type {
  DashboardSummary,
  WeekPoint,
  QualificationShield,
  QualifiedYield,
  SpeedToFirstTouch,
} from '@/lib/dashboard-metrics'

interface HeroKpiBarProps {
  summary: DashboardSummary
  trend: WeekPoint[]
  qualifiedYield: QualifiedYield
  speedToFirstTouch: SpeedToFirstTouch
  qualification: QualificationShield
}

// Section A -- the four hero cards. Sits Delivered is the one metric that
// gets the primary/10 tint; everything else stays neutral (bg-card) so the
// hero outcome reads as the headline and nothing competes with it.
export default function HeroKpiBar({
  summary,
  trend,
  qualifiedYield,
  speedToFirstTouch,
  qualification,
}: HeroKpiBarProps) {
  const lastTwo = trend.slice(-2)
  const thisWeek = lastTwo[1]?.sits ?? trend[trend.length - 1]?.sits ?? 0
  const lastWeek = lastTwo[0]?.sits ?? null
  const wowPercent =
    lastWeek !== null && lastWeek > 0
      ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      : lastWeek === 0 && thisWeek > 0
        ? 100
        : null
  const sparkPoints = trend.slice(-8).map((t) => t.sits)

  const conversionRate =
    qualifiedYield.qualifiedLeads > 0 ? Math.round((qualifiedYield.sits / qualifiedYield.qualifiedLeads) * 100) : null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Sits Delivered -- the hero outcome */}
      <KpiCard highlight>
        <div className="mb-3 flex items-center justify-between">
          <CardLabel>Sits Delivered</CardLabel>
          <TrendBadge percent={wowPercent} label="vs last wk" />
        </div>
        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{summary.sitsLast7d}</div>
        <p className="mt-1 text-xs text-muted-foreground">Last 7 days &middot; {summary.sitsTotal} all-time</p>
        <div className="mt-3">
          <Sparkline points={sparkPoints} />
        </div>
      </KpiCard>

      {/* 2. Lead -> Sit Conversion (Qualified Yield) */}
      <KpiCard>
        <div className="mb-3 flex items-center justify-between">
          <CardLabel>Lead &rarr; Sit Conversion</CardLabel>
          <Target size={15} className="text-subtle" />
        </div>
        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {conversionRate !== null ? `${conversionRate}%` : '--'}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {conversionRate !== null
            ? `${qualifiedYield.sits} / ${qualifiedYield.qualifiedLeads} qualified`
            : 'Not enough qualified leads yet'}
        </p>
      </KpiCard>

      {/* 3. Speed to First Touch */}
      <KpiCard>
        <div className="mb-3 flex items-center justify-between">
          <CardLabel>Speed to First Touch</CardLabel>
          <Clock size={15} className="text-subtle" />
        </div>
        {speedToFirstTouch.avgMinutes !== null ? (
          <>
            <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {speedToFirstTouch.avgMinutes < 60
                ? `${speedToFirstTouch.avgMinutes}m`
                : `${Math.round((speedToFirstTouch.avgMinutes / 60) * 10) / 10}h`}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                  speedToFirstTouch.avgMinutes < 5
                    ? 'border-success/20 bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                {speedToFirstTouch.avgMinutes < 5 ? '< 5 min' : 'tracked'}
              </span>
              <span className="text-xs text-subtle">
                {speedToFirstTouch.source === 'lead_assigned' ? 'via lead assignment' : 'via first outbound'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold tracking-tight text-subtle">--</div>
            <p className="mt-1 text-xs text-muted-foreground">Not enough data yet</p>
          </>
        )}
      </KpiCard>

      {/* 4. Qualification Shield (Time Saved) */}
      <KpiCard>
        <div className="mb-3 flex items-center justify-between">
          <CardLabel>Qualification Shield</CardLabel>
          <ShieldCheck size={15} className="text-subtle" />
        </div>
        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {qualification.screenedCount}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          leads screened &middot; ~{qualification.hoursSaved} hrs saved
        </p>
      </KpiCard>
    </div>
  )
}
