import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Validate redirect path to prevent Open Redirection attacks
  const isSafeRelative =
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('\\') &&
    !next.includes('@')

  const safeRedirectPath = isSafeRelative ? next : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeRedirectPath}`)
    }
  }

  // Something went wrong — redirect to login with an error
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate with Google`)
}
