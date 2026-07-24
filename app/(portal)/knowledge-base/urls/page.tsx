import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KbUrlsClient from './KbUrlsClient'
import type { KbUrl } from '@/types/kb'

export default async function KnowledgeBaseUrlsPage({
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

  const activeClientId =
    portalUser.role === 'admin' ? selectedClientId ?? null : portalUser.client_id ?? null

  if (!activeClientId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3 bg-card rounded-xl border border-border p-8">
        <h2 className="text-xl font-bold">Select a client</h2>
        <p className="text-muted-foreground text-sm text-center">
          Choose a client from the sidebar search to review their knowledge base URLs.
        </p>
      </div>
    )
  }

  const { data: rows, error } = await supabase
    .from('kb_urls')
    .select('id, url, title, excluded')
    .eq('client_id', activeClientId)
    .order('url', { ascending: true })
  if (error) console.error('kb_urls query failed:', error)

  const urls: KbUrl[] = (rows ?? []).map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    excluded: r.excluded,
  }))

  return <KbUrlsClient urls={urls} clientId={activeClientId} />
}
