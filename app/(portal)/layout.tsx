import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import PortalShell from '@/components/layout/PortalShell'
import type { Client, PortalUser } from '@/types/supabase'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user details from portal_users
  const { data: portalUser, error: userError } = await supabase
    .from('portal_users')
    .select('id, auth_user_id, email, role, client_id, full_name, phone')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (userError || !portalUser) {
    // If the auth user has no portal profile, sign out and send back to login
    await supabase.auth.signOut()
    redirect('/login')
  }

  // If user is an admin, fetch all clients for the spoofing dropdown
  let clients: Client[] = []
  if (portalUser.role === 'admin') {
    const { data } = await supabase
      .from('clients')
      .select('id, company_name, ghl_location_id, billing_email, billing_day, billing_status, deposit_sits_remaining')
      .order('company_name', { ascending: true })
    clients = (data as Client[]) || []
  }

  return (
    <PortalShell portalUser={portalUser} clients={clients}>
      {children}
    </PortalShell>
  )
}
