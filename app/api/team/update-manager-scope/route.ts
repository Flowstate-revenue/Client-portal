import { NextResponse } from 'next/server'

// DEPRECATED -- superseded by /api/team/update-manager, which now updates
// name/phone alongside the single is_super_manager flag in one action
// (the old two independent scopes this route toggled no longer exist as
// columns; the set_manager_scope() RPC it called has been dropped).
//
// Nothing in the app calls this route anymore -- couldn't delete the file
// itself (locked by the running dev server in the build sandbox), so it's
// left here returning 410 rather than erroring against a dropped RPC.
// Safe to delete this whole app/api/team/update-manager-scope/ directory.
export async function POST() {
  return NextResponse.json(
    { error: 'gone', message: 'Use /api/team/update-manager instead.' },
    { status: 410 }
  )
}
