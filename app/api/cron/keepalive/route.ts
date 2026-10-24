import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Optional Vercel Cron Secret validation
    const authHeader = request.headers.get('authorization')
    const url = new URL(request.url)
    const secretParam = url.searchParams.get('key')

    if (process.env.CRON_SECRET) {
      const isValidBearer = authHeader === `Bearer ${process.env.CRON_SECRET}`
      const isValidParam = secretParam === process.env.CRON_SECRET
      if (!isValidBearer && !isValidParam) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // 1. Direct database query via Prisma to reset Supabase compute idle timer
    const result = await prisma.$queryRaw<Array<{ ping: number }>>`SELECT 1 as ping`

    // 2. Ping Supabase REST API endpoint to register API activity
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    let restStatus = 'skipped'
    if (supabaseUrl && supabaseKey) {
      try {
        const restRes = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })
        restStatus = `status_${restRes.status}`
      } catch (err: unknown) {
        restStatus = err instanceof Error ? err.message : 'failed'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase keepalive ping successful. Compute timer reset.',
      timestamp: new Date().toISOString(),
      dbPing: result,
      restApi: restStatus,
    })
  } catch (error: unknown) {
    console.error('Keepalive cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
