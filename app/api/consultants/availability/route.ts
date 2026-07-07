import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Set a consultant's routing availability: pause (holiday/leave) and share
// (part-time weight, 1 = full). Authorized inside the RPC via has_client_access.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { id?: string; paused?: boolean; weight?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const { error } = await supabase.rpc('portal_set_consultant_availability', {
    p_id: body.id,
    p_paused: body.paused ?? false,
    p_weight: body.weight ?? 1,
  })
  if (error) {
    const status = error.message.includes('forbidden')
      ? 403
      : error.message.includes('not_found')
        ? 404
        : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true })
}
