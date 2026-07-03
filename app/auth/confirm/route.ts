import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Only allow same-site relative paths as the post-auth redirect target.
// Blocks open-redirect/phishing via ?next=@evil.com, //evil.com, /\evil.com, etc.
function safeNext(raw: string | null): string {
  const fallback = '/update-password'
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

// Landing point for Supabase invite & password-reset email links.
// Establishes the LINK's session, then sends the user to set a password.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  const supabase = await createClient()

  // Clear any existing session first, so a link opened while someone else is
  // already signed in can never carry the wrong identity through. Only the
  // identity proven by this link's token should take effect.
  await supabase.auth.signOut()

  // Preferred: server-side OTP verification (works regardless of browser/session)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(new URL(next, origin))
  } else if (code) {
    // Fallback: PKCE code exchange (used when initiated in the same browser)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.redirect(new URL('/login?error=link_invalid', origin))
}
