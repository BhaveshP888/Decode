'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScanSearch } from 'lucide-react'

// Google G logo as inline SVG — no external dependency needed
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success, the browser is redirected to Google — no need to handle here
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-sm bg-zinc-900/80 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
              <ScanSearch className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Welcome to Decode
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Know exactly what goes into your body.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <Button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-12 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-100 font-medium gap-3 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </Button>

          <p className="text-xs text-zinc-600 text-center leading-relaxed">
            By continuing, you agree to our terms of service.
            <br />
            Your data is used only to track your personal ingredient exposure.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
