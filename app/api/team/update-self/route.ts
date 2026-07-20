import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Lets ANY logged-in portal user (owner, manager, or admin) edit their own
// name/phone on their own portal_users row. No authorization check needed
// beyond "is logged in" -- this runs under the caller's own session, and
// the column-level grant (see migration lock_down_portal_users_self_update)
// only allows UPDATE on full_name/phone at the database level, so there's
// no way for this route (or anyone) to smuggle a role/scope/client_id
// change through it even if the request body includes those fields.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { full_name?: string; phone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (typeof body.full_name === 'string') updates.full_name = body.full_name.trim()
  if (typeof body.phone === 'string') updates.phone = body.phone.trim()
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_editable_fields' }, { status: 400 })
  }

  const { error } = await supabase.from('portal_users').update(updates).eq('auth_user_id', user.id)
  if (error) {
    console.error('team/update-self failed:', error)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
