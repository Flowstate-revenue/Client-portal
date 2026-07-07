import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ConsultantsTabs from './ConsultantsTabs'
import type { Consultant, GHLSyncStatus } from '@/types/consultant'
import type { TerritoryZip } from '@/types/territory'

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
  routing_paused: boolean
  routing_weight: number
  created_at: string
}

type TerritoryRow = {
  zip: string
  last_assigned_at: string | null
  consultants: {
    id: string
    first_name: string | null
    last_name: string | null
    routing_paused: boolean
    routing_weight: number
  } | null
  zipcodes: { city: string | null; state: string | null } | null
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
    routingPaused: r.routing_paused ?? false,
    routingWeight: r.routing_weight ?? 1,
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
      'id, ghl_user_id, ghl_location_id, first_name, last_name, email, phone, zip_codes, spanish_speaker, ghl_sync_status, active, routing_paused, routing_weight, created_at'
    )
    .eq('active', true)
  if (activeClientId) query = query.eq('client_id', activeClientId)

  const { data: rows, error } = await query.order('created_at', { ascending: false })
  if (error) console.error('consultants query failed:', error)

  // Compose the GHL form URL from the stored form ID + domain. Default is
  // Flowstate's shared links.flowstaterevenue.com (each sub-account serves its
  // own form from it); a client's own branded_domain overrides it once set.
  // Falls back to a global env default when no client is selected.
  let formUrl: string | null = process.env.NEXT_PUBLIC_GHL_CONSULTANT_FORM_URL ?? null
  if (activeClientId) {
    const { data: c } = await supabase
      .from('clients')
      .select('consultant_form_id, branded_domain')
      .eq('id', activeClientId)
      .maybeSingle()
    if (c?.consultant_form_id) {
      const domain = c.branded_domain || 'links.flowstaterevenue.com'
      formUrl = `https://${domain}/widget/form/${c.consultant_form_id}`
    }
  }

  const consultants = (rows ?? []).map((r) => mapRow(r as Row))

  // Territory coverage (read-only view). RLS scopes to the client; admins can
  // view-as via ?client_id. Grouped by zip: one row per zip with its reps.
  let tQuery = supabase
    .from('territories')
    .select(
      'zip, last_assigned_at, consultants(id, first_name, last_name, routing_paused, routing_weight), zipcodes(city, state)'
    )
  if (activeClientId) tQuery = tQuery.eq('client_id', activeClientId)
  const { data: tRows } = await tQuery.order('zip')

  const tMap = new Map<string, TerritoryZip>()
  for (const r of (tRows ?? []) as unknown as TerritoryRow[]) {
    let g = tMap.get(r.zip)
    if (!g) {
      g = { zip: r.zip, city: r.zipcodes?.city ?? null, state: r.zipcodes?.state ?? null, reps: [], lastAssigned: null }
      tMap.set(r.zip, g)
    }
    if (r.consultants) {
      g.reps.push({
        consultantId: r.consultants.id,
        name: `${r.consultants.first_name ?? ''} ${r.consultants.last_name ?? ''}`.trim() || '—',
        sharePct: Math.round((r.consultants.routing_weight ?? 1) * 100),
        paused: r.consultants.routing_paused ?? false,
      })
    }
    if (r.last_assigned_at && (!g.lastAssigned || r.last_assigned_at > g.lastAssigned)) {
      g.lastAssigned = r.last_assigned_at
    }
  }
  const territories = Array.from(tMap.values())

  return (
    <ConsultantsTabs
      consultants={consultants}
      role={portalUser.role}
      activeClientId={activeClientId}
      formUrl={formUrl}
      territories={territories}
    />
  )
}
