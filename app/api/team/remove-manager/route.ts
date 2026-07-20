import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Removes a client_manager's portal_users row. Authorization lives inside
// the remove_manager() SQL function (checks the caller's own
// can_manage_managers via private.can_manage_managers, and refuses to
// touch anything that isn't role='client_manager' -- owner/admin rows are
// untouchable through this path). This route just relays the call under
// the caller's own session so auth.uid() resolves correctly inside the
// function.
//
// Note: this removes the portal_users row only. It does not delete the
// underlying Supabase Auth user, so if the same email is re-invited later
// the invite flow will find and reuse that auth user rather than erroring.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { portal_user_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.portal_user_id) return NextResponse.json({ error: 'missing_portal_user_id' }, { status: 400 })

  const { error } = await supabase.rpc('remove_manager', { p_target_id: body.portal_user_id })
  if (error) {
    const status = error.message.includes('not_authorized')
      ? 403
      : error.message.includes('not_a_manager')
        ? 400
        : error.message.includes('not_found')
          ? 404
          : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true })
}
