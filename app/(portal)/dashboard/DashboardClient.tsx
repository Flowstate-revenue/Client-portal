'use client'

import { Calendar, TrendingUp, BarChart3, Sparkles } from 'lucide-react'
import { PRODUCT_LIST } from '@/lib/products'

// Live KPI dashboard. Stat cards + both charts are wired to real data from
// public.portal_kpi_summary / public.portal_kpi_weekly_trend (see
// app/(portal)/dashboard/page.tsx for the queries). The funnel card stays a
// placeholder — lead pipeline / conversion data lives in GHL and isn't synced
// into Supabase yet.

export interface DashboardSummary {
  sitsTotal: number
  sitsLast7d: number
  sitsLast30d: number
  sitsValueTotal: number
  proposalFollowupsTotal: number
  reactivationsTotal: number
  referralsTotal: number
  reviewsTotal: number
  totalEvents: number
  totalBillableValue: number
}

export interface WeekPoint {
  weekStart: string
  sits: number
}

interface DashboardClientProps {
  summary: DashboardSummary
  trend: WeekPoint[]
}

const COUNT_KEY: Record<string, keyof DashboardSummary> = {
  sit: 'sitsTotal',
  proposal_followup: 'proposalFollowupsTotal',
  reactivation: 'reactivationsTotal',
  referral: 'referralsTotal',
  review: 'reviewsTotal',
}

function ComingSoon() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--subtle)' }}
    >
      <Sparkles size={11} />
      Coming soon
    </span>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DashboardClient({ summary, trend }: DashboardClientProps) {
  const maxSits = Math.max(1, ...trend.map((t) => t.sits))
  const width = 520
  const height = 180
  const marginTop = 20
  const marginBottom = 20
  const plotHeight = height - marginTop - marginBottom

  const points = trend.map((t, i) => {
    const x = trend.length > 1 ? (i / (trend.length - 1)) * width : width / 2
    const y = height - marginBottom - (t.sits / maxSits) * plotHeight
    return { x, y }
  })
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPath =
    points.length > 0
      ? `M${points[0].x},${height} L${polyline.replace(/ /g, ' L')} L${points[points.length - 1].x},${height} Z`
      : ''

  const barMax = Math.max(1, ...PRODUCT_LIST.map((p) => summary[COUNT_KEY[p.key]] as number))

  return (
    <div className="p-8 space-y-6">
      {/* Title block */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Performance across your follow-up engines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm opacity-60"
            style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
          >
            <Calendar size={16} />
            All time
          </div>
        </div>
      </div>

      {/* Stat cards — one per product */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PRODUCT_LIST.map((p) => {
          const count = summary[COUNT_KEY[p.key]] as number
          const sub =
            p.key === 'sit'
              ? `${summary.sitsLast30d} in last 30 days`
              : 'All-time total'
          return (
            <Card key={p.key}>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.hex, opacity: 0.85 }} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {p.labelPlural}
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight mb-3" style={{ color: 'var(--foreground)' }}>
                {count}
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={13} style={{ color: 'var(--subtle)' }} />
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {sub}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sits trend line chart (2/3) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--subtle)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Sit appointments over time
              </span>
            </div>
          </div>
          {trend.length >= 2 ? (
            <div style={{ color: 'var(--primary)' }}>
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44" role="img" aria-label="Sits per week">
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    x2={width}
                    y1={40 * i + 20}
                    y2={40 * i + 20}
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    strokeDasharray="4 6"
                  />
                ))}
                <path d={areaPath} fill="currentColor" fillOpacity="0.12" />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex justify-between mt-1 text-[11px]" style={{ color: 'var(--subtle)' }}>
                <span>{formatDate(trend[0].weekStart)}</span>
                <span>{formatDate(trend[trend.length - 1].weekStart)}</span>
              </div>
            </div>
          ) : (
            <div
              className="h-44 flex items-center justify-center text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Not enough weekly data yet
            </div>
          )}
        </Card>

        {/* Bar chart: outcomes by product (1/3) */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} style={{ color: 'var(--subtle)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Outcomes by product
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-44 px-1">
            {PRODUCT_LIST.map((p) => {
              const count = summary[COUNT_KEY[p.key]] as number
              const h = count / barMax
              return (
                <div key={p.key} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--muted-foreground)' }}>
                    {count}
                  </span>
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${Math.max(h * 100, count > 0 ? 4 : 0)}%`, backgroundColor: p.hex, opacity: 0.85 }}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Wide funnel / table placeholder — blocked on GHL pipeline data, not wired yet */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Lead conversion funnel
          </span>
          <ComingSoon />
        </div>
        <div className="space-y-3">
          {[1, 0.82, 0.6, 0.4, 0.24].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="h-3 w-28 rounded animate-pulse"
                style={{ backgroundColor: 'var(--border)', opacity: 0.8 }}
              />
              <div className="flex-1">
                <div
                  className="animate-pulse rounded h-6"
                  style={{ width: `${w * 100}%`, backgroundColor: 'var(--border)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
