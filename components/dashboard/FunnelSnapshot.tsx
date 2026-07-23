import { KpiCard, CardLabel } from './KpiCard'
import PeriodToggle, { type FunnelPeriod } from './PeriodToggle'
import { buildFunnelRates, countsToFunnelStages, type FunnelPeriodCounts } from '@/lib/dashboard-metrics'

interface FunnelSnapshotProps {
  counts: FunnelPeriodCounts
  period: FunnelPeriod
}

const PERIOD_LABEL: Record<FunnelPeriod, string> = {
  today: 'today',
  week: 'the last 7 days',
  month: 'the last 30 days',
  sixmonth: 'the last 6 months',
}

// Section B, left column (2/3 width). Vertical bars, scaled to CONVERSION
// RATE (% of raw leads reaching each stage) rather than raw headcount, and
// with no "drop-off" framing between stages. A 90%+ falloff from raw lead
// to closed deal is normal in home services (published lead-to-close
// benchmarks run 2-16% depending on trade) -- showing that as loss
// misrepresents a healthy business. The two callouts above the chart map to
// the two stages of that industry benchmark ladder we can compute today
// (Lead -> Appointment, Appointment -> Sit); benchmark comparison bands
// aren't wired in yet, but the stage structure is ready for them.
export default function FunnelSnapshot({ counts, period }: FunnelSnapshotProps) {
  const stages = countsToFunnelStages(counts)
  const rates = buildFunnelRates(counts)
  const rawLeads = counts.rawLeads
  const hasData = rawLeads > 0

  return (
    <KpiCard className="lg:col-span-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <CardLabel>Live Funnel Snapshot</CardLabel>
        <PeriodToggle active={period} />
      </div>

      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No leads created in {PERIOD_LABEL[period]} yet
        </div>
      ) : (
        <>
          {/* Headline conversion rates -- the two computable stages of the
              industry benchmark ladder (Proposal -> Close isn't tracked yet). */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Lead &rarr; Appointment</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {rates.leadToAppointmentPct !== null ? `${rates.leadToAppointmentPct}%` : '--'}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Appointment &rarr; Sit</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {rates.appointmentToSitPct !== null ? `${rates.appointmentToSitPct}%` : '--'}
              </div>
            </div>
          </div>

          {/* Vertical bars: height = % of raw leads reaching that stage. */}
          <div className="flex h-48 items-end justify-between gap-3 px-1">
            {stages.map((stage) => {
              const pct = rawLeads > 0 ? Math.round((stage.count / rawLeads) * 100) : 0
              const barHeightPct = Math.max(pct, stage.count > 0 ? 4 : 0)
              return (
                <div key={stage.key} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div className="mb-1.5 text-xs font-semibold tabular-nums text-foreground">{pct}%</div>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t ${stage.key === 'sat' ? 'bg-primary' : 'bg-primary/50'}`}
                      style={{ height: `${barHeightPct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-center text-xs font-medium text-muted-foreground">{stage.label}</div>
                  <div className="text-[11px] tabular-nums text-subtle">{stage.count}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </KpiCard>
  )
}
