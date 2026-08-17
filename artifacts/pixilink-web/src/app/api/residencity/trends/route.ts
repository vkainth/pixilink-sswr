import { NextRequest, NextResponse } from 'next/server'

const LARAVEL_INTERNAL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const days = req.nextUrl.searchParams.get('days') ?? '60'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST
  try {
    const res = await fetch(`${LARAVEL_INTERNAL_URL}/api-internal/residencity/trends?days=${days}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
}
