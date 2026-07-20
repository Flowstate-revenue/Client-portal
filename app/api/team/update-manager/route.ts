import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Owner/super-manager editing ANOTHER manager: name, phone, and their
// super-manager status, all in one action. Authorization lives inside the
// update_manager() SQL function (checks the caller's own is_super_manager
// via private.can_manage_team, refuses to touch anything that isn't
// role='client_manager', and refuses self-targeting -- nobody edits their
// own name/phone/permissions through this path, even a super manager;
// self-edits go through /api/team/update-self instead).
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { portal_user_id?: string; full_name?: string; phone?: string; is_super_manager?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.portal_user_id) return NextResponse.json({ error: 'missing_portal_user_id' }, { status: 400 })
  if (!body.full_name || !body.full_name.trim()) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }

  const { error } = await supabase.rpc('update_manager', {
    p_target_id: body.portal_user_id,
    p_full_name: body.full_name,
    p_phone: body.phone ?? '',
    p_is_super_manager: body.is_super_manager === true,
  })
  if (error) {
    const status = error.message.includes('not_authorized')
      ? 403
      : error.message.includes('cannot_edit_self')
        ? 400
        : error.message.includes('not_a_manager')
          ? 400
          : error.message.includes('not_found')
            ? 404
            : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true })
}
