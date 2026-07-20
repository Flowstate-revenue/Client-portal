import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Toggles a manager's two scope flags (can_manage_managers,
// can_access_billing). Authorization lives inside the set_manager_scope()
// SQL function -- same shape as remove-manager.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { portal_user_id?: string; can_manage_managers?: boolean; can_access_billing?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.portal_user_id) return NextResponse.json({ error: 'missing_portal_user_id' }, { status: 400 })

  const { error } = await supabase.rpc('set_manager_scope', {
    p_target_id: body.portal_user_id,
    p_can_manage_managers: body.can_manage_managers === true,
    p_can_access_billing: body.can_access_billing === true,
  })
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
