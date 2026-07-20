import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Read-only preview of what deleting a consultant would do — same
// "zips with no other active rep" computation as portal_delete_consultant,
// but without mutating anything. Lets the delete confirmation modal show
// the real impact (and offer reassignment) before the consultant is removed.
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

  const { data, error } = await supabase.rpc('portal_preview_delete_consultant', { p_id: body.id })
  if (error) {
    const status = error.message.includes('forbidden')
      ? 403
      : error.message.includes('not_found')
        ? 404
        : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  const result = (data ?? {}) as { uncovered_zips?: string[]; ghl_user_id?: string | null }
  return NextResponse.json({
    ok: true,
    uncovered_zips: result.uncovered_zips ?? [],
    has_ghl_user: !!result.ghl_user_id,
  })
}
