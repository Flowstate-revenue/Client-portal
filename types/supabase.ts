export interface Client {
  id: string
  company_name: string
  ghl_location_id: string | null
  billing_email: string | null
  billing_day: string | null
  billing_status: string | null
  deposit_sits_remaining: number | null
}

// Full profile shape for the My Account page -- a superset of Client
// (above) which stays intentionally narrow for the places that only need
// a company name + billing basics (e.g. the admin view-as dropdown).
export interface ClientProfile {
  id: string
  company_name: string
  primary_contact_name: string | null
  primary_contact_email: string | null
  billing_email: string | null
  phone: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  stripe_customer_id: string | null
}

export interface BillableEvent {
  id: string
  client_id: string | null
  ghl_location_id: string | null
  outcome_type: 'sit' | 'proposal_followup' | 'reactivation' | 'referral' | 'review' | string
  lead_name: string | null
  lead_email: string | null
  lead_phone: string | null
  event_date: string
  unit_price: number
  status: 'not_yet_billed' | 'covered_by_deposit' | 'invoice_created' | 'payment_pending' | 'paid' | 'failed' | string
  created_at: string
  // Optional joined client info
  clients?: {
    company_name: string
  } | null
}

// One row per client from the public.portal_kpi_summary view. Count/bigint
// columns come back from PostgREST as numeric strings — always coerce with
// Number(x) || 0 at the call site (same convention as BillableEvent.unit_price
// below).
export interface PortalKpiSummary {
  client_id: string
  company_name: string
  billing_status: string | null
  sits_total: number
  sits_last_7d: number
  sits_last_30d: number
  sits_value_total: number
  proposal_followups_total: number
  reactivations_total: number
  referrals_total: number
  reviews_total: number
  total_events: number
  total_billable_value: number
  first_event_at: string | null
  last_event_at: string | null
}

// One row per (client, week, outcome_type) from the
// public.portal_kpi_weekly_trend(p_weeks) RPC.
export interface PortalKpiWeeklyTrendRow {
  client_id: string
  week_start: string
  outcome_type: 'sit' | 'proposal_followup' | 'reactivation' | 'referral' | 'review' | string
  event_count: number
  event_value: number
}

export interface PortalUser {
  id: string
  auth_user_id: string | null
  email: string
  role: 'admin' | 'client_owner' | 'client_manager' | 'client' | string
  client_id: string | null
  full_name: string | null
  phone: string | null
  // client_manager only -- meaningless for admin/client_owner (already
  // full-access). A super manager has everything client_owner has except
  // removing the owner. See private.can_manage_team.
  is_super_manager?: boolean
}

// A row in the My Account "Team" list -- the owner + every client_manager
// for a client. Narrower than PortalUser (no auth_user_id needed by most
// callers) but keeps it for the "is this me?" comparison in the UI.
export interface TeamMember {
  id: string
  auth_user_id: string | null
  email: string
  role: 'client_owner' | 'client_manager' | string
  full_name: string | null
  phone: string | null
  is_super_manager: boolean
  created_at: string
}
