import { CalendarCheck, LifeBuoy, UserX } from 'lucide-react'
import { KpiCard, CardLabel } from './KpiCard'
import type { NoShowRescue } from '@/lib/dashboard-metrics'

interface NoShowRescueCardProps {
  data: NoShowRescue
}

// Section B, right column (1/3 width). Read from the lead_events timeline
// (see lib/dashboard-metrics.ts), so a lead who no-showed and was later
// rebooked-and-sat is correctly counted as a rescue rather than hidden by
// the appointment's final "sat" snapshot state.
export default function NoShowRescueCard({ data }: NoShowRescueCardProps) {
  const { totalBooked, noShows, rescued } = data
  const recoveryRate = noShows > 0 ? Math.round((rescued / noShows) * 100) : null

  const rows: { icon: typeof CalendarCheck; label: string; value: number; tone?: 'success' | 'destructive' }[] = [
    { icon: CalendarCheck, label: 'Total Booked Sits', value: totalBooked },
    { icon: UserX, label: 'No-Shows', value: noShows, tone: noShows > 0 ? 'destructive' : undefined },
    { icon: LifeBuoy, label: 'Rescued / Rebooked', value: rescued, tone: rescued > 0 ? 'success' : undefined },
  ]

  return (
    <KpiCard>
      <div className="mb-5 flex items-center justify-between">
        <CardLabel>No-Show &amp; Rescue</CardLabel>
      </div>

      {totalBooked === 0 ? (
        <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
          No appointments booked yet
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <row.icon
                  size={15}
                  className={
                    row.tone === 'destructive' ? 'text-destructive' : row.tone === 'success' ? 'text-success' : 'text-subtle'
                  }
                />
                <span className="text-sm text-muted-foreground">{row.label}</span>
              </div>
              <span
                className={`text-lg font-semibold tabular-nums ${
                  row.tone === 'destructive' ? 'text-destructive' : row.tone === 'success' ? 'text-success' : 'text-foreground'
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}

          <div className="border-t border-border pt-4">
            {noShows === 0 ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-success">Perfect attendance</span> -- no no-shows this period
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Recovery rate</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${
                    recoveryRate && recoveryRate >= 50
                      ? 'border-success/20 bg-success/10 text-success'
                      : 'border-warning/20 bg-warning/10 text-warning'
                  }`}
                >
                  {recoveryRate}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </KpiCard>
  )
}
