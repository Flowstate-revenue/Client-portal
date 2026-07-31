import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'
import type { BillableEvent } from '@/types/supabase'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const resolvedParams = await searchParams
  const client_id = resolvedParams?.client_id

  const supabase = await createClient()

  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current portal user profile
  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('id, auth_user_id, email, role, client_id, full_name, phone, is_super_manager')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!portalUser) {
    redirect('/login')
  }

  // admin and client_owner always have billing access; a client_manager
  // only does if they're a super manager. Mirrors the same check enforced
  // server-side in the /api/billing/* routes -- this one is just so the
  // button doesn't show at all for a manager who can't use it.
  const hasBillingAccess =
    portalUser.role === 'admin' ||
    portalUser.role === 'client_owner' ||
    (portalUser.role === 'client_manager' && portalUser.is_super_manager === true)

  // Build the query to load billable events joined with company name
  let query = supabase
    .from('billable_events')
    .select(`
      id,
      client_id,
      ghl_location_id,
      outcome_type,
      lead_name,
      lead_email,
      lead_phone,
      event_date,
      unit_price,
      status,
      created_at,
      clients (
        company_name
      )
    `)

  // Apply scopes/filters
  if (portalUser.role === 'admin') {
    if (client_id) {
      query = query.eq('client_id', client_id)
    }
  } else {
    if (portalUser.client_id) {
      query = query.eq('client_id', portalUser.client_id)
    } else {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-card rounded-xl border border-border p-8">
          <h2 className="text-xl font-bold">Access Scopes Restricted</h2>
          <p className="text-muted-foreground text-sm text-center">
            Your user account does not have a client relationship mapped. Please contact an administrator.
          </p>
        </div>
      )
    }
  }

  const { data: events, error } = await query.order('event_date', { ascending: false })

  if (error) {
    console.error('Supabase query failed:', error)
  }

  const resolvedClientId = client_id || portalUser.client_id || null

  // client_components reflects real Stripe subscription state -- written by
  // stripe-subscription-sync, never by the portal. Feeds the Manage
  // Billing modal's Turn On/Off panel.
  let activeComponents: { component_key: string; status: string }[] = []
  if (resolvedClientId) {
    const { data: componentRows } = await supabase
      .from('client_components')
      .select('component_key, status')
      .eq('client_id', resolvedClientId)
    activeComponents = componentRows || []
  }

  return (
    <BillingClient
      initialEvents={(events as unknown as BillableEvent[]) || []}
      role={portalUser.role}
      activeClientId={resolvedClientId}
      activeComponents={activeComponents}
      hasBillingAccess={hasBillingAccess}
    />
  )
}
