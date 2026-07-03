import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone()

  // NEVER run session logic on the auth handshake or static assets.
  // The /auth/* route handlers set their own auth cookies (sign-out + verify);
  // if we refresh/touch cookies here we can clobber that Set-Cookie and let a
  // stale session (e.g. an already-logged-in admin) survive the confirm link.
  const isStaticFile =
    url.pathname.includes('.') ||
    url.pathname.startsWith('/_next') ||
    url.pathname === '/favicon.ico'
  const isAuthRoute = url.pathname.startsWith('/auth')
  if (isStaticFile || isAuthRoute) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicPaths = ['/login', '/forgot-password', '/update-password']
  const isPublic = publicPaths.includes(url.pathname)

  if (!user && !isPublic) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (url.pathname === '/login' || url.pathname === '/')) {
    url.pathname = '/billing'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
