import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MyAccountClient from './MyAccountClient'
import type { ClientProfile } from '@/types/supabase'

export default async function MyAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const resolvedParams = await searchParams
  const client_id = resolvedParams?.client_id

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('id, auth_user_id, email, role, client_id, full_name, phone, is_super_manager')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!portalUser) redirect('/login')

  // client_owner always manages their own client; an admin may pass a
  // client_id to view/edit on behalf of a client (view-as).
  const resolvedClientId = portalUser.role === 'admin' ? client_id || null : portalUser.client_id

  if (!resolvedClientId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-card rounded-xl border border-border p-8">
        <h2 className="text-xl font-bold">No Client Selected</h2>
        <p className="text-muted-foreground text-sm text-center">
          {portalUser.role === 'admin'
            ? 'Pick a client from the dropdown above to view their account.'
            : 'Your user account does not have a client relationship mapped. Please contact an administrator.'}
        </p>
      </div>
    )
  }

  const { data: client } = await supabase
    .from('clients')
    .select(
      'id, company_name, primary_contact_name, primary_contact_email, billing_email, phone, website, address_line1, address_line2, city, state, postal_code, country, stripe_customer_id'
    )
    .eq('id', resolvedClientId)
    .maybeSingle()

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-card rounded-xl border border-border p-8">
        <h2 className="text-xl font-bold">Client Not Found</h2>
        <p className="text-muted-foreground text-sm text-center">
          This client record could not be loaded.
        </p>
      </div>
    )
  }

  // Team: owner row + every client_manager for this client. Everyone sees
  // the full roster (read-only unless it's their own row, or they're the
  // owner/a super manager); the fine-grained edit/remove authorization is
  // enforced again server-side in the /api/team/* routes regardless of
  // what this page renders.
  const { data: teamMembers } = await supabase
    .from('portal_users')
    .select('id, auth_user_id, email, role, full_name, phone, is_super_manager, created_at')
    .eq('client_id', resolvedClientId)
    .in('role', ['client_owner', 'client_manager'])
    .order('role', { ascending: true }) // 'client_manager' < 'client_owner' alphabetically -- re-sorted client-side
    .order('created_at', { ascending: true })

  // admin can always manage the team; client_owner always can; a
  // client_manager only can if they're a super manager.
  const canManageTeam =
    portalUser.role === 'admin' || portalUser.role === 'client_owner' || portalUser.is_super_manager === true

  // Billing (client_products, Manage Billing modal) lives on the Billing
  // page now -- this page no longer needs that data.
  return (
    <MyAccountClient
      client={client as ClientProfile}
      teamMembers={teamMembers ?? []}
      currentAuthUserId={user.id}
      canManageTeam={canManageTeam}
    />
  )
}
