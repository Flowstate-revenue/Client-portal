// Pure, dependency-free aggregation logic for the client dashboard.
//
// Design principle (per Flowstate-Dashboard-Metrics-Reference): "sell the
// outcome, not the plumbing." Every function here takes raw rows from
// lead_events / opportunities (the append-only timeline + current pipeline
// state) and returns a small, presentation-ready shape. No Supabase client
// lives in this file -- it is pure and unit-testable.
//
// Sourcing rule (from the reference doc, section 2): "No-show/rebook counted
// from lead_events, never the current stage (a rebooked no-show hides in the
// snapshot)." That's why the funnel, speed, and no-show/rescue metrics below
// are all derived from lead_events timeline rows rather than the appointments
// snapshot table -- appointments only carries "current state," which erases
// exactly the history these metrics need.
//
// Sourcing rule #2: "unqualified != lost -- exclude from the conversion
// denominator, surface separately as a benefit." Every conversion-style ratio
// below excludes unqualified/abandoned leads from its denominator; the
// Qualification Shield reframes that same count as delivered value (time
// saved), never as a loss.

export interface LeadEventRow {
  event_type: string
  occurred_at: string
  contact_id: string | null
  opportunity_id: string | null
  pipeline_stage: string | null
  opportunity_status: string | null
  client_id: string | null
}

export interface OpportunityRow {
  ghl_contact_id: string | null
  ghl_opportunity_id: string
  status: string | null
  pipeline_stage: string | null
  client_id: string | null
}

export interface FunnelStage {
  key: 'raw' | 'engaged' | 'qualified' | 'scheduled' | 'sat'
  label: string
  count: number
}

export interface FunnelSnapshot {
  stages: FunnelStage[]
}

export interface QualificationShield {
  screenedCount: number
  hoursSaved: number
}

export interface SpeedToFirstTouch {
  avgMinutes: number | null
  sampleSize: number
  /** Which event type powered the calc -- surfaced in the UI so the number
   *  is never presented as more precise than the underlying data supports. */
  source: 'first_outbound' | 'lead_assigned' | null
}

export interface NoShowRescue {
  totalBooked: number
  noShows: number
  rescued: number
}

export interface QualifiedYield {
  sits: number
  qualifiedLeads: number
}

// Shape of the aggregated portal_kpi_summary view (see page.tsx) and its
// weekly-trend sibling. Defined here -- rather than in the client component --
// so every dashboard component can import the same types without reaching
// into the page-level client file.
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

// Sales-consultant hours saved per screened-out (unqualified) lead. A
// screened-out lead is one that never becomes a wasted home visit -- this is
// the average consultant time (travel + attempted visit) a bad-fit lead would
// otherwise have consumed. Tunable; kept as a named constant rather than a
// magic number so it's easy to revisit once we have real time-tracking data.
export const HOURS_SAVED_PER_SCREENED_LEAD = 1.5

// Funnel/event-type stage ranks. Higher = further along. `pipeline_stage` on
// a lead_events row is the primary signal; when it's null (e.g. some
// appointment_booked webhooks don't carry a stage) we fall back to a rank
// inferred from the event_type itself.
const STAGE_RANK: Record<string, number> = {
  'new lead': 0,
  'in conversation': 1,
  unqualified: 1, // screened out -- they WERE engaged, but capped below "qualified"
  qualified: 2,
  'appointment scheduled': 3,
  'no-show': 3, // still counts as scheduled; a rescued no-show can still reach "sat"
  'sit appointment': 4,
}

const EVENT_TYPE_RANK: Record<string, number> = {
  lead_engaged: 1,
  first_outbound: 1,
  appointment_booked: 3,
  appointment_confirmed: 3,
  appointment_rescheduled: 3,
  appointment_no_show: 3,
  appointment_cancelled: 3,
  appointment_sat: 4,
}

const UNQUALIFIED_STAGE = 'unqualified'
const UNQUALIFIED_STATUSES = new Set(['abandoned', 'lost'])

function rankFromStage(stage: string | null | undefined): number | null {
  if (!stage) return null
  const key = stage.trim().toLowerCase()
  return key in STAGE_RANK ? STAGE_RANK[key] : null
}

function isUnqualifiedSignal(stage: string | null | undefined, status: string | null | undefined): boolean {
  if (stage && stage.trim().toLowerCase() === UNQUALIFIED_STAGE) return true
  if (status && UNQUALIFIED_STATUSES.has(status.trim().toLowerCase())) return true
  return false
}

// A lead is keyed by client+contact so an admin's all-clients aggregate view
// never collides two different clients' GHL contact ids.
function leadKey(clientId: string | null, contactId: string | null): string | null {
  if (!contactId) return null
  return `${clientId ?? 'unknown'}:${contactId}`
}

interface LeadState {
  maxRank: number
  unqualified: boolean
  /** Date (YYYY-MM-DD, UTC) of this lead's earliest lead_created event --
   *  their "cohort" day. Null if we never saw a lead_created event for them
   *  (e.g. an opportunity referencing a contact outside the fetched
   *  window) -- such leads are excluded from cohort-windowed views since
   *  they can't be reliably placed in a cohort. */
  cohortDate: string | null
}

/** Single pass over lead_events + opportunities: for every lead (keyed by
 *  contact), work out the furthest pipeline rank they've ever reached,
 *  whether they were ever screened out as unqualified, and which day's
 *  cohort they belong to. This one map powers the funnel (whole-window and
 *  cohort-windowed), the qualification shield, and the qualified-yield
 *  ratio, so every metric agrees on the same underlying population.
 *
 *  This mirrors the cohort/rank logic in the refresh-portal-funnel-daily
 *  Edge Function (supabase/functions -- ported there since Edge Functions
 *  can't import this module directly). Keep both in sync if the
 *  pipeline-stage taxonomy changes. */
function buildLeadStates(
  leadEvents: LeadEventRow[],
  opportunities: OpportunityRow[]
): Map<string, LeadState> {
  const states = new Map<string, LeadState>()

  const touch = (key: string | null, rank: number, unqualified: boolean, cohortDate: string | null = null) => {
    if (!key) return
    const existing = states.get(key)
    if (!existing) {
      states.set(key, { maxRank: rank, unqualified, cohortDate })
      return
    }
    existing.maxRank = Math.max(existing.maxRank, rank)
    existing.unqualified = existing.unqualified || unqualified
    if (cohortDate && (!existing.cohortDate || cohortDate < existing.cohortDate)) existing.cohortDate = cohortDate
  }

  for (const row of leadEvents) {
    const key = leadKey(row.client_id, row.contact_id)
    if (!key) continue
    // Ensure every lead_created contact enters the population even if
    // nothing else ever happens to them (rank 0, "raw"), and record their
    // cohort day.
    if (row.event_type === 'lead_created') touch(key, 0, false, row.occurred_at.slice(0, 10))

    const unqualified = isUnqualifiedSignal(row.pipeline_stage, row.opportunity_status)
    const stageRank = rankFromStage(row.pipeline_stage)
    const rank = stageRank ?? EVENT_TYPE_RANK[row.event_type] ?? 0
    touch(key, rank, unqualified)
  }

  for (const opp of opportunities) {
    const key = leadKey(opp.client_id, opp.ghl_contact_id)
    if (!key) continue
    const unqualified = isUnqualifiedSignal(opp.pipeline_stage, opp.status)
    const rank = rankFromStage(opp.pipeline_stage) ?? 0
    touch(key, rank, unqualified)
  }

  return states
}

/** Raw stage counts for a period -- the same shape whether they came from a
 *  live reduction over lead_events/opportunities (the "Today" window) or
 *  from summing pre-aggregated rows out of portal_funnel_daily (Week /
 *  Month / 6 Month). Rate calculations (buildFunnelRates) and the stage-bar
 *  chart (countsToFunnelStages) both consume this shape so the funnel
 *  component never needs to know which source it came from. */
export interface FunnelPeriodCounts {
  rawLeads: number
  engaged: number
  qualified: number
  scheduled: number
  sat: number
}

function statesToCounts(states: LeadState[]): FunnelPeriodCounts {
  const countAtLeast = (min: number) => states.filter((s) => s.maxRank >= min).length
  return {
    rawLeads: countAtLeast(0),
    engaged: countAtLeast(1),
    qualified: countAtLeast(2),
    scheduled: countAtLeast(3),
    sat: countAtLeast(4),
  }
}

/** Whole-window funnel counts (every lead in the fetched lead_events /
 *  opportunities, regardless of cohort day) -- used by the "Today" cards
 *  that aren't cohort-windowed (Qualification Shield, Qualified Yield,
 *  Speed to First Touch, No-Show/Rescue). */
export function buildFunnelCounts(leadEvents: LeadEventRow[], opportunities: OpportunityRow[]): FunnelPeriodCounts {
  return statesToCounts(Array.from(buildLeadStates(leadEvents, opportunities).values()))
}

/** Cohort-windowed funnel counts: only leads whose cohort day (first
 *  lead_created event) falls on or after `sinceDateIso`. This is what
 *  powers the funnel card's "Today" toggle option -- Week/Month/6-Month
 *  read from the pre-aggregated portal_funnel_daily table instead (see
 *  page.tsx), since recomputing a 6-month live reduction on every request
 *  doesn't scale the way a once-nightly batch job does. */
export function buildFunnelCountsForCohortWindow(
  leadEvents: LeadEventRow[],
  opportunities: OpportunityRow[],
  sinceDateIso: string
): FunnelPeriodCounts {
  const states = Array.from(buildLeadStates(leadEvents, opportunities).values()).filter(
    (s) => s.cohortDate !== null && s.cohortDate >= sinceDateIso
  )
  return statesToCounts(states)
}

export function countsToFunnelStages(counts: FunnelPeriodCounts): FunnelStage[] {
  return [
    { key: 'raw', label: 'Raw Leads', count: counts.rawLeads },
    { key: 'engaged', label: 'Engaged', count: counts.engaged },
    { key: 'qualified', label: 'Qualified', count: counts.qualified },
    { key: 'scheduled', label: 'Scheduled', count: counts.scheduled },
    { key: 'sat', label: 'Sits Delivered', count: counts.sat },
  ]
}

export function buildFunnelSnapshot(leadEvents: LeadEventRow[], opportunities: OpportunityRow[]): FunnelSnapshot {
  return { stages: countsToFunnelStages(buildFunnelCounts(leadEvents, opportunities)) }
}

export interface FunnelRates {
  /** Solar-benchmark "Lead to Appointment": scheduled ÷ raw leads. */
  leadToAppointmentPct: number | null
  /** Solar-benchmark "Appointment to Proposal/Sit" (the site-visit IS the
   *  proposal moment in home services): sat ÷ scheduled. */
  appointmentToSitPct: number | null
}

/** Conversion RATES, not raw counts -- the framing the funnel card leads
 *  with. A 95% drop from raw leads to closed deals is normal for this
 *  industry (2-7% lead-to-close is the published benchmark); showing that
 *  as "loss" misrepresents a healthy business. These two rates map to the
 *  two stages of the solar/home-services benchmark ladder we can actually
 *  compute today (Lead→Appointment, Appointment→Sit); Proposal→Close is
 *  intentionally omitted until proposal_sent/deal_won events start
 *  flowing through lead_events. */
export function buildFunnelRates(counts: FunnelPeriodCounts): FunnelRates {
  return {
    leadToAppointmentPct: counts.rawLeads > 0 ? Math.round((counts.scheduled / counts.rawLeads) * 100) : null,
    appointmentToSitPct: counts.scheduled > 0 ? Math.round((counts.sat / counts.scheduled) * 100) : null,
  }
}

export function buildQualificationShield(
  leadEvents: LeadEventRow[],
  opportunities: OpportunityRow[]
): QualificationShield {
  const states = buildLeadStates(leadEvents, opportunities)
  const screenedCount = Array.from(states.values()).filter((s) => s.unqualified).length
  return {
    screenedCount,
    hoursSaved: Math.round(screenedCount * HOURS_SAVED_PER_SCREENED_LEAD * 10) / 10,
  }
}

/** Sits ÷ qualified leads, where "qualified" means *not screened out* -- per
 *  the reference doc, unqualified leads are excluded from the denominator
 *  entirely rather than counted as a loss. This is deliberately a different
 *  population than the funnel's "Qualified" stage bucket (which only counts
 *  leads that specifically reached the Qualified pipeline stage): this ratio
 *  answers "of everyone still in play, how many became a sit," while the
 *  funnel answers "how many specifically passed the Qualified stage gate." */
export function buildQualifiedYield(leadEvents: LeadEventRow[], opportunities: OpportunityRow[]): QualifiedYield {
  const states = buildLeadStates(leadEvents, opportunities)
  const all = Array.from(states.values())
  const qualifiedLeads = all.filter((s) => !s.unqualified).length
  const sits = all.filter((s) => s.maxRank >= 4).length
  return { sits, qualifiedLeads }
}

/** avg(first_outbound - lead_created) per contact. Falls back to
 *  lead_assigned when no first_outbound events exist yet (common pre-launch,
 *  before outbound-call webhooks are wired up) so the card can still show a
 *  real number instead of a permanent empty state -- the UI labels which
 *  source powered the number so it's never overclaimed as more precise than
 *  it is. */
export function buildSpeedToFirstTouch(leadEvents: LeadEventRow[]): SpeedToFirstTouch {
  const createdAt = new Map<string, number>()
  const touchAt = new Map<string, { first_outbound?: number; lead_assigned?: number }>()

  for (const row of leadEvents) {
    const key = leadKey(row.client_id, row.contact_id)
    if (!key) continue
    const t = new Date(row.occurred_at).getTime()
    if (Number.isNaN(t)) continue

    if (row.event_type === 'lead_created') {
      const existing = createdAt.get(key)
      if (existing === undefined || t < existing) createdAt.set(key, t)
    }
    if (row.event_type === 'first_outbound' || row.event_type === 'lead_assigned') {
      const bucket = touchAt.get(key) ?? {}
      const field = row.event_type as 'first_outbound' | 'lead_assigned'
      if (bucket[field] === undefined || t < (bucket[field] as number)) bucket[field] = t
      touchAt.set(key, bucket)
    }
  }

  for (const source of ['first_outbound', 'lead_assigned'] as const) {
    const diffsMinutes: number[] = []
    for (const [key, created] of createdAt) {
      const touch = touchAt.get(key)?.[source]
      if (touch === undefined) continue
      const minutes = (touch - created) / 60000
      if (minutes >= 0) diffsMinutes.push(minutes)
    }
    if (diffsMinutes.length > 0) {
      const avg = diffsMinutes.reduce((a, b) => a + b, 0) / diffsMinutes.length
      return { avgMinutes: Math.round(avg * 10) / 10, sampleSize: diffsMinutes.length, source }
    }
  }

  return { avgMinutes: null, sampleSize: 0, source: null }
}

/** Booked / no-show / rescued, read from the lead_events timeline so a
 *  rebooked-and-sat lead is correctly counted as rescued even though their
 *  *current* pipeline stage only shows the final outcome. */
export function buildNoShowRescue(leadEvents: LeadEventRow[], opportunities: OpportunityRow[]): NoShowRescue {
  const states = buildLeadStates(leadEvents, opportunities)
  const totalBooked = Array.from(states.values()).filter((s) => s.maxRank >= 3).length

  const timelineByLead = new Map<string, { type: string; t: number }[]>()
  for (const row of leadEvents) {
    const key = leadKey(row.client_id, row.contact_id)
    if (!key) continue
    if (row.event_type !== 'appointment_no_show' && row.event_type !== 'appointment_sat') continue
    const t = new Date(row.occurred_at).getTime()
    if (Number.isNaN(t)) continue
    const list = timelineByLead.get(key) ?? []
    list.push({ type: row.event_type, t })
    timelineByLead.set(key, list)
  }

  let noShows = 0
  let rescued = 0
  for (const events of timelineByLead.values()) {
    events.sort((a, b) => a.t - b.t)
    const hadNoShow = events.some((e) => e.type === 'appointment_no_show')
    if (!hadNoShow) continue
    noShows += 1
    // Rescued if a sat event happened at or after the first no-show.
    const firstNoShow = events.find((e) => e.type === 'appointment_no_show')!.t
    if (events.some((e) => e.type === 'appointment_sat' && e.t >= firstNoShow)) rescued += 1
  }

  return { totalBooked, noShows, rescued }
}
