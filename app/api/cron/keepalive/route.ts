import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET is required' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    const expectedHeader = `Bearer ${cronSecret}`

    const isAuthorized =
      Boolean(authHeader) &&
      authHeader!.length === expectedHeader.length &&
      timingSafeEqual(Buffer.from(authHeader!), Buffer.from(expectedHeader))

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      } catch {
        restStatus = 'failed'
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
        error: 'Keepalive operation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
