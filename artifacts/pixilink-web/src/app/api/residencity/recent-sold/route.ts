import { NextRequest, NextResponse } from 'next/server'

const LARAVEL_INTERNAL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RawSold = Record<string, unknown>

function normalizeSold(p: RawSold) {
  const soldprice = p.price ?? p.soldprice_2
  return {
    subarea:   typeof p.subarea   === 'string' ? p.subarea   : '',
    city:      typeof p.city      === 'string' ? p.city      : '',
    type:      typeof p.type      === 'string' ? p.type      : (typeof p.class === 'string' ? p.class : ''),
    price:     typeof soldprice   === 'number' ? soldprice   : parseFloat(String(soldprice ?? '0')) || 0,
    sold_date: typeof p.sold_date === 'string' ? p.sold_date : '',
  }
}

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get('limit') ?? '40'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST
  try {
    const res = await fetch(`${LARAVEL_INTERNAL_URL}/api-internal/residencity/recent-sold?limit=${limit}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    })
    const raw: RawSold[] = await res.json()
    const data = Array.isArray(raw) ? raw.map(normalizeSold) : []
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
