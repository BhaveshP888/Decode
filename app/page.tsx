import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/dashboard'

/**
 * Root page: gate-keeps the dashboard behind auth.
 * - Unauthenticated → landing page
 * - Authenticated   → dashboard
 */
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/landing')
  }

  return <Dashboard />
}
