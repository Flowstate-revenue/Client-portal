import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

// Shared card shell + small primitives (trend badge, sparkline) used across
// the dashboard's hero KPI bar, funnel, and secondary sections. Every visual
// here is built from theme tokens (bg-card / border-border / text-* / etc.)
// -- no hardcoded hex values or inline styles, per the Flowstate design
// system rules in app/globals.css.

interface KpiCardProps {
  children: ReactNode
  className?: string
  /** Subtle primary tint for the single hero/outcome card -- primary is the
   *  only brand accent, reserved for the one metric that matters most. */
  highlight?: boolean
}

export function KpiCard({ children, className = '', highlight = false }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight ? 'border-primary/30 bg-primary/10' : 'border-border bg-card'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-subtle">{children}</span>
  )
}

type Tone = 'success' | 'destructive' | 'muted'

interface TrendBadgeProps {
  /** Signed percent, e.g. 12 or -8. Direction/tone derive from the sign
   *  unless `tone` is passed explicitly (useful when "up" is bad, e.g. a
   *  no-show rate). */
  percent: number | null
  tone?: Tone
  label?: string
}

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success/10 text-success border-success/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  muted: 'bg-muted text-muted-foreground border-border',
}

export function TrendBadge({ percent, tone, label }: TrendBadgeProps) {
  if (percent === null) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES.muted}`}>
        <Minus size={11} />
        {label ?? 'No prior data'}
      </span>
    )
  }
  const resolvedTone: Tone = tone ?? (percent > 0 ? 'success' : percent < 0 ? 'destructive' : 'muted')
  const Icon = percent > 0 ? ArrowUpRight : percent < 0 ? ArrowDownRight : Minus
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${TONE_CLASSES[resolvedTone]}`}
    >
      <Icon size={11} />
      {percent > 0 ? '+' : ''}
      {percent}%{label ? ` ${label}` : ''}
    </span>
  )
}

interface SparklineProps {
  points: number[]
  width?: number
  height?: number
}

// Minimal inline area/line sparkline. Deliberately hand-rolled (no chart
// library) to match the rest of the portal, which renders its charts as
// plain SVG driven by currentColor so they inherit text-primary etc.
export function Sparkline({ points, width = 160, height = 40 }: SparklineProps) {
  if (points.length < 2) {
    return <div className="h-10 w-full" />
  }
  const max = Math.max(1, ...points)
  const min = Math.min(0, ...points)
  const range = Math.max(1, max - min)
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return { x, y }
  })
  const polyline = coords.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPath = `M${coords[0].x},${height} L${polyline.replace(/ /g, ' L')} L${coords[coords.length - 1].x},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full text-primary" preserveAspectRatio="none">
      <path d={areaPath} fill="currentColor" fillOpacity="0.14" />
      <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
