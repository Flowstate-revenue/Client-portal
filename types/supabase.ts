export interface Client {
  id: string
  company_name: string
  ghl_location_id: string | null
  billing_email: string | null
  billing_day: string | null
  billing_status: string | null
  deposit_sits_remaining: number | null
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

export interface PortalUser {
  id: string
  auth_user_id: string | null
  email: string
  role: 'admin' | 'client_owner' | 'client_manager' | 'client' | string
  client_id: string | null
  full_name: string | null
  phone: string | null
}
