import { ChevronDown } from 'lucide-react'
import { KpiCard, CardLabel } from './KpiCard'
import type { FunnelSnapshot as FunnelSnapshotData } from '@/lib/dashboard-metrics'

interface FunnelSnapshotProps {
  funnel: FunnelSnapshotData
}

// Section B, left column (2/3 width). Live, interactive-feeling funnel --
// each stage is a full-width bar scaled against the top-of-funnel count,
// with a drop-off badge between consecutive stages. Replaces the old
// skeleton/placeholder bars entirely.
export default function FunnelSnapshot({ funnel }: FunnelSnapshotProps) {
  const { stages } = funnel
  const topCount = stages[0]?.count ?? 0
  const hasData = topCount > 0

  return (
    <KpiCard className="lg:col-span-2">
      <div className="mb-5 flex items-center justify-between">
        <CardLabel>Live Funnel Snapshot</CardLabel>
        <span className="text-xs text-subtle">Raw Leads &rarr; Sits Delivered</span>
      </div>

      {!hasData ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No leads in this period yet
        </div>
      ) : (
        <div className="space-y-1">
          {stages.map((stage, i) => {
            const prev = i > 0 ? stages[i - 1] : null
            const widthPct = topCount > 0 ? Math.max((stage.count / topCount) * 100, stage.count > 0 ? 3 : 0) : 0
            const dropPct =
              prev && prev.count > 0 ? Math.round(((prev.count - stage.count) / prev.count) * 100) : null

            return (
              <div key={stage.key}>
                {prev && (
                  <div className="flex items-center gap-1.5 py-1 pl-1 text-xs text-subtle">
                    <ChevronDown size={12} />
                    {dropPct !== null && dropPct > 0 ? (
                      <span
                        className={
                          dropPct >= 50
                            ? 'font-medium text-destructive'
                            : dropPct >= 25
                              ? 'font-medium text-warning'
                              : 'font-medium text-muted-foreground'
                        }
                      >
                        -{dropPct}% drop-off
                      </span>
                    ) : (
                      <span className="font-medium text-success">no drop-off</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-xs font-medium text-muted-foreground">{stage.label}</div>
                  <div className="h-6 flex-1 rounded bg-muted">
                    <div
                      className={`h-6 rounded ${stage.key === 'sat' ? 'bg-primary' : 'bg-primary/60'}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                    {stage.count}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </KpiCard>
  )
}
