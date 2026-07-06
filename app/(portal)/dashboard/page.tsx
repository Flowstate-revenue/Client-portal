import { Calendar, TrendingUp, BarChart3, Sparkles } from 'lucide-react'

// Placeholder KPI dashboard. Layout preview only — no live data yet.
// Everything uses design-system tokens (var(--*)) so it follows light/dark.
// The five cards map to Flowstate's five billable products; visuals are grayed
// until we decide exactly what to measure from GHL and how to visualize it.

const PRODUCTS = [
  { key: 'sit', label: 'Sit Appointments', color: '#f59e0b' },
  { key: 'proposal_followup', label: 'Proposal Follow-ups', color: '#3b82f6' },
  { key: 'reactivation', label: 'Reactivations', color: '#a855f7' },
  { key: 'referral', label: 'Referrals', color: '#14b8a6' },
  { key: 'review', label: 'Reviews', color: '#f43f5e' },
] as const

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: 'var(--border)', ...style }}
    />
  )
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

export default function DashboardPage() {
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
            Last 30 days
          </div>
          <ComingSoon />
        </div>
      </div>

      {/* Preview banner */}
      <div
        className="rounded-lg px-4 py-3 text-sm"
        style={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
      >
        This is a preview of the KPI layout. Live numbers will appear here once reporting is
        connected.
      </div>

      {/* Stat cards — one per product */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PRODUCTS.map((p) => (
          <Card key={p.key}>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color, opacity: 0.85 }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                {p.label}
              </span>
            </div>
            <Skeleton className="h-7 w-20 mb-3" />
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} style={{ color: 'var(--subtle)' }} />
              <Skeleton className="h-3 w-14" />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend / line chart placeholder (2/3) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--subtle)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Appointments over time
              </span>
            </div>
            <ComingSoon />
          </div>
          <div style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
            <svg viewBox="0 0 520 180" className="w-full h-44" role="img" aria-label="Chart placeholder">
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="0"
                  x2="520"
                  y1={40 * i + 20}
                  y2={40 * i + 20}
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeDasharray="4 6"
                />
              ))}
              <path
                d="M0,140 L65,110 L130,120 L195,80 L260,95 L325,55 L390,70 L455,40 L520,60 L520,180 L0,180 Z"
                fill="currentColor"
                fillOpacity="0.12"
              />
              <polyline
                points="0,140 65,110 130,120 195,80 260,95 325,55 390,70 455,40 520,60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Card>

        {/* Bar chart placeholder (1/3) */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} style={{ color: 'var(--subtle)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Outcomes by product
              </span>
            </div>
            <ComingSoon />
          </div>
          <div className="flex items-end justify-between gap-2 h-44 px-1">
            {[0.5, 0.8, 0.35, 0.65, 0.45].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className="animate-pulse rounded-t"
                  style={{ height: `${h * 100}%`, backgroundColor: 'var(--border)' }}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Wide funnel / table placeholder */}
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
              <Skeleton className="h-3 w-28" style={{ opacity: 0.8 }} />
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
