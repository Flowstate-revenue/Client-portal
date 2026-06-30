import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

  const url = request.nextUrl.clone()
  
  // Exclude static files, images, favicon, api routes that don't need protection
  const isStaticFile = 
    url.pathname.includes('.') || 
    url.pathname.startsWith('/_next') || 
    url.pathname === '/favicon.ico'
  
  if (isStaticFile) {
    return supabaseResponse
  }

  const isAuthRoute = url.pathname.startsWith('/auth')
  const isLoginRoute = url.pathname === '/login'

  if (!user && !isAuthRoute && !isLoginRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (isLoginRoute || url.pathname === '/')) {
    url.pathname = '/billing'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
