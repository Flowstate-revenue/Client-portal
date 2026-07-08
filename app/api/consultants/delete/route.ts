import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Soft-delete a consultant. The RPC self-authorizes via has_client_access,
// deactivates the row, frees their territory coverage, and returns the zips
// that no longer have any active rep so the UI can flag the gaps.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const { data, error } = await supabase.rpc('portal_delete_consultant', { p_id: body.id })
  if (error) {
    const status = error.message.includes('forbidden')
      ? 403
      : error.message.includes('not_found')
        ? 404
        : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  const result = (data ?? {}) as { uncovered_zips?: string[] }
  return NextResponse.json({ ok: true, uncovered_zips: result.uncovered_zips ?? [] })
}
