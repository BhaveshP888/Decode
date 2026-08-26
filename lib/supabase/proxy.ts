import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // 1. Fast-path: Never run auth network calls on public pages, landing, auth routes, or static files
  if (
    pathname.startsWith('/landing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png'
  ) {
    return supabaseResponse
  }

  // 2. Fast-path: Check for Supabase session cookies before querying Supabase over the network
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(cookie =>
    cookie.name.includes('supabase') ||
    cookie.name.startsWith('sb-') ||
    cookie.name.includes('auth-token')
  )

  if (!hasAuthCookie) {
    // Unauthenticated user attempting to access a protected route -> redirect immediately with zero network latency
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }

  // 3. User has auth cookies and is visiting a protected route -> validate session
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

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
