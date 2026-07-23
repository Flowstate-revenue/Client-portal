import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient, { type DashboardData, type WeekPoint } from './DashboardClient'
import type { PortalKpiSummary, PortalKpiWeeklyTrendRow } from '@/types/supabase'
import {
  buildFunnelSnapshot,
  buildNoShowRescue,
  buildQualificationShield,
  buildQualifiedYield,
  buildSpeedToFirstTouch,
  type LeadEventRow,
  type OpportunityRow,
} from '@/lib/dashboard-metrics'

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const resolved = await searchParams
  const selectedClientId = resolved?.client_id

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

  const funnel = buildFunnelSnapshot(leadEvents, opportunities)
  const qualification = buildQualificationShield(leadEvents, opportunities)
  const qualifiedYield = buildQualifiedYield(leadEvents, opportunities)
  const speedToFirstTouch = buildSpeedToFirstTouch(leadEvents)
  const noShowRescue = buildNoShowRescue(leadEvents, opportunities)

  const data: DashboardData = {
    summary,
    trend,
    funnel,
    qualification,
    qualifiedYield,
    speedToFirstTouch,
    noShowRescue,
  }

  return <DashboardClient data={data} />
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
