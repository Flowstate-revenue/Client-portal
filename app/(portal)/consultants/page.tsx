import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ConsultantsClient from './ConsultantsClient'
import type { Consultant, GHLSyncStatus } from '@/types/consultant'

type Row = {
  id: string
  ghl_user_id: string | null
  ghl_location_id: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  zip_codes: string[] | null
  spanish_speaker: boolean
  ghl_sync_status: string
  active: boolean
  created_at: string
}

function mapRow(r: Row): Consultant {
  const status: GHLSyncStatus = ['synced', 'pending', 'error'].includes(r.ghl_sync_status)
    ? (r.ghl_sync_status as GHLSyncStatus)
    : 'synced'
  return {
    id: r.id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email,
    phone: r.phone ?? '',
    zipCodes: r.zip_codes ?? [],
    spanishSpeaker: r.spanish_speaker,
    ghlUserId: r.ghl_user_id,
    ghlLocationId: r.ghl_location_id,
    ghlSyncStatus: status,
    active: r.active,
    createdAt: r.created_at,
  }
}

export default async function ConsultantsPage({
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

  let query = supabase
    .from('consultants')
    .select(
      'id, ghl_user_id, ghl_location_id, first_name, last_name, email, phone, zip_codes, spanish_speaker, ghl_sync_status, active, created_at'
    )
    .eq('active', true)
  if (activeClientId) query = query.eq('client_id', activeClientId)

  const { data: rows, error } = await query.order('created_at', { ascending: false })
  if (error) console.error('consultants query failed:', error)

  // per-client GHL form URL (falls back to a global env default)
  let formUrl: string | null = process.env.NEXT_PUBLIC_GHL_CONSULTANT_FORM_URL ?? null
  if (activeClientId) {
    const { data: c } = await supabase
      .from('clients')
      .select('consultant_form_url')
      .eq('id', activeClientId)
      .maybeSingle()
    if (c?.consultant_form_url) formUrl = c.consultant_form_url
  }

  const consultants = (rows ?? []).map((r) => mapRow(r as Row))

  return (
    <ConsultantsClient
      consultants={consultants}
      role={portalUser.role}
      activeClientId={activeClientId}
      formUrl={formUrl}
    />
  )
}
