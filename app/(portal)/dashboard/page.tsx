import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient, { type DashboardData, type WeekPoint } from './DashboardClient'
import type { PortalKpiSummary, PortalKpiWeeklyTrendRow } from '@/types/supabase'
import type { FunnelPeriod } from '@/components/dashboard/PeriodToggle'
import {
  buildFunnelCountsForCohortWindow,
  buildNoShowRescue,
  buildQualificationShield,
  buildQualifiedYield,
  buildSpeedToFirstTouch,
  type FunnelPeriodCounts,
  type LeadEventRow,
  type OpportunityRow,
} from '@/lib/dashboard-metrics'

// Cohort-window lengths for the funnel card's period toggle. "today" is
// computed live from lead_events/opportunities (see below); the other three
// read from the portal_funnel_daily pre-aggregation table instead, since
// re-deriving a 6-month reduction from raw events on every page load is the
// exact thing that table exists to avoid.
const PERIOD_WINDOW_DAYS: Record<Exclude<FunnelPeriod, 'today'>, number> = {
  week: 7,
  month: 30,
  sixmonth: 182,
}

interface PortalFunnelDailyRow {
  client_id: string
  cohort_date: string
  raw_leads: number
  engaged: number
  qualified: number
  scheduled: number
  sat: number
}

// How far back we pull the raw lead_events / opportunities timeline for the
// funnel, speed, qualification, and no-show/rescue metrics. Volume is low
// today, but this keeps the query bounded as it grows -- if this ever needs
// to look further back (e.g. a client asking about last quarter), promote it
// to a real date-range control instead of widening the constant.
const TIMELINE_LOOKBACK_DAYS = 180

// Plain helper (not a component/hook) so the impure Date.now() call doesn't
// trip the react-hooks purity rule, which treats PascalCase/useX function
// bodies as render code that must be idempotent.
function lookbackIsoDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

const VALID_PERIODS: FunnelPeriod[] = ['today', 'week', 'month', 'sixmonth']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; period?: string }>
}) {
  const resolved = await searchParams
  const selectedClientId = resolved.client_id
  const period: FunnelPeriod = VALID_PERIODS.includes(resolved.period as FunnelPeriod)
    ? (resolved.period as FunnelPeriod)
    : 'today'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('id, role, client_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!portalUser) redirect('/login')

  if (portalUser.role !== 'admin' && !portalUser.client_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-card rounded-xl border border-border p-8">
        <h2 className="text-xl font-bold">Access Scopes Restricted</h2>
        <p className="text-muted-foreground text-sm text-center">
          Your user account does not have a client relationship mapped. Please contact an administrator.
        </p>
      </div>
    )
  }

  // admin can view-as-client via ?client_id; a client login is locked to their own
  const activeClientId =
    portalUser.role === 'admin' ? selectedClientId ?? null : portalUser.client_id ?? null

  // Stat cards: portal_kpi_summary has one row per client (RLS already scopes
  // this to what the caller is allowed to see). A specific client gets its own
  // row; an admin with no client selected gets every row, summed into one
  // aggregate view.
  let summaryQuery = supabase.from('portal_kpi_summary').select('*')
  if (activeClientId) summaryQuery = summaryQuery.eq('client_id', activeClientId)
  const { data: summaryRows, error: summaryError } = await summaryQuery
  if (summaryError) console.error('portal_kpi_summary query failed:', summaryError)

  const summary = aggregateSummary((summaryRows as PortalKpiSummary[]) ?? [])

  // Trend: sits per week for the last 12 weeks, scoped the same way. Powers
  // both the hero sparkline and its week-over-week comparison badge.
  const { data: trendRows, error: trendError } = await supabase.rpc('portal_kpi_weekly_trend', {
    p_weeks: 12,
  })
  if (trendError) console.error('portal_kpi_weekly_trend query failed:', trendError)

  const trend = buildWeeklySitsTrend((trendRows as PortalKpiWeeklyTrendRow[]) ?? [], activeClientId)

  // Raw pipeline timeline, scoped the same way as everything else. Funnel,
  // qualification, speed-to-touch, and no-show/rescue are all derived from
  // these two tables in lib/dashboard-metrics.ts (see that file for why
  // lead_events -- not the appointments snapshot table -- is the source of
  // truth for anything history-shaped).
  const lookbackIso = lookbackIsoDate(TIMELINE_LOOKBACK_DAYS)

  let leadEventsQuery = supabase
    .from('lead_events')
    .select('event_type, occurred_at, contact_id, opportunity_id, pipeline_stage, opportunity_status, client_id')
    .gte('occurred_at', lookbackIso)
    .order('occurred_at', { ascending: true })
    .limit(5000)
  if (activeClientId) leadEventsQuery = leadEventsQuery.eq('client_id', activeClientId)
  const { data: leadEventRows, error: leadEventsError } = await leadEventsQuery
  if (leadEventsError) console.error('lead_events query failed:', leadEventsError)

  let opportunitiesQuery = supabase
    .from('opportunities')
    .select('ghl_contact_id, ghl_opportunity_id, status, pipeline_stage, client_id')
    .limit(5000)
  if (activeClientId) opportunitiesQuery = opportunitiesQuery.eq('client_id', activeClientId)
  const { data: opportunityRows, error: opportunitiesError } = await opportunitiesQuery
  if (opportunitiesError) console.error('opportunities query failed:', opportunitiesError)

  const leadEvents = (leadEventRows as LeadEventRow[]) ?? []
  const opportunities = (opportunityRows as OpportunityRow[]) ?? []

  // Funnel card: "today" is a live cohort-window reduction over the same
  // lead_events/opportunities fetch above (today's volume is small enough
  // that this is cheap and always fresh). Week/Month/6-Month instead sum
  // pre-aggregated rows out of portal_funnel_daily -- see
  // supabase/functions/refresh-portal-funnel-daily, which recomputes that
  // table nightly via pg_cron.
  const funnelCounts: FunnelPeriodCounts =
    period === 'today'
      ? buildFunnelCountsForCohortWindow(leadEvents, opportunities, todayIsoDate())
      : await fetchFunnelCountsFromDaily(supabase, activeClientId, PERIOD_WINDOW_DAYS[period])

  const qualification = buildQualificationShield(leadEvents, opportunities)
  const qualifiedYield = buildQualifiedYield(leadEvents, opportunities)
  const speedToFirstTouch = buildSpeedToFirstTouch(leadEvents)
  const noShowRescue = buildNoShowRescue(leadEvents, opportunities)

  const data: DashboardData = {
    summary,
    trend,
    funnelCounts,
    period,
    qualification,
    qualifiedYield,
    speedToFirstTouch,
    noShowRescue,
  }

  return <DashboardClient data={data} />
}

// YYYY-MM-DD (UTC) for "today" -- matches the cohort_date format written by
// refresh-portal-funnel-daily (occurred_at.slice(0, 10)), so the live
// "today" reduction and the pre-aggregated rows use the same day boundary.
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

async function fetchFunnelCountsFromDaily(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activeClientId: string | null,
  windowDays: number
): Promise<FunnelPeriodCounts> {
  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let query = supabase
    .from('portal_funnel_daily')
    .select('client_id, cohort_date, raw_leads, engaged, qualified, scheduled, sat')
    .gte('cohort_date', sinceDate)
  if (activeClientId) query = query.eq('client_id', activeClientId)

  const { data, error } = await query
  if (error) console.error('portal_funnel_daily query failed:', error)

  const rows = (data as PortalFunnelDailyRow[]) ?? []
  return rows.reduce(
    (acc, r) => ({
      rawLeads: acc.rawLeads + (Number(r.raw_leads) || 0),
      engaged: acc.engaged + (Number(r.engaged) || 0),
      qualified: acc.qualified + (Number(r.qualified) || 0),
      scheduled: acc.scheduled + (Number(r.scheduled) || 0),
      sat: acc.sat + (Number(r.sat) || 0),
    }),
    { rawLeads: 0, engaged: 0, qualified: 0, scheduled: 0, sat: 0 }
  )
}

// Sum every visible client's row into one aggregate. For a client_owner (or an
// admin viewing-as one client) this is just that single row passed through.
function aggregateSummary(rows: PortalKpiSummary[]): DashboardData['summary'] {
  return rows.reduce(
    (acc, r) => ({
      sitsTotal: acc.sitsTotal + (Number(r.sits_total) || 0),
      sitsLast7d: acc.sitsLast7d + (Number(r.sits_last_7d) || 0),
      sitsLast30d: acc.sitsLast30d + (Number(r.sits_last_30d) || 0),
      sitsValueTotal: acc.sitsValueTotal + (Number(r.sits_value_total) || 0),
      proposalFollowupsTotal: acc.proposalFollowupsTotal + (Number(r.proposal_followups_total) || 0),
      reactivationsTotal: acc.reactivationsTotal + (Number(r.reactivations_total) || 0),
      referralsTotal: acc.referralsTotal + (Number(r.referrals_total) || 0),
      reviewsTotal: acc.reviewsTotal + (Number(r.reviews_total) || 0),
      totalEvents: acc.totalEvents + (Number(r.total_events) || 0),
      totalBillableValue: acc.totalBillableValue + (Number(r.total_billable_value) || 0),
    }),
    {
      sitsTotal: 0,
      sitsLast7d: 0,
      sitsLast30d: 0,
      sitsValueTotal: 0,
      proposalFollowupsTotal: 0,
      reactivationsTotal: 0,
      referralsTotal: 0,
      reviewsTotal: 0,
      totalEvents: 0,
      totalBillableValue: 0,
    }
  )
}

// portal_kpi_weekly_trend returns rows for every client the caller can see.
// Filter to the active client (if one is selected) and collapse to sits/week.
function buildWeeklySitsTrend(
  rows: PortalKpiWeeklyTrendRow[],
  activeClientId: string | null
): WeekPoint[] {
  const byWeek = new Map<string, number>()
  for (const r of rows) {
    if (r.outcome_type !== 'sit') continue
    if (activeClientId && r.client_id !== activeClientId) continue
    byWeek.set(r.week_start, (byWeek.get(r.week_start) ?? 0) + (Number(r.event_count) || 0))
  }
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, sits]) => ({ weekStart, sits }))
}
