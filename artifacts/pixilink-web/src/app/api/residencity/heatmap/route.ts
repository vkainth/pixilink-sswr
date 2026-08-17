import { NextRequest, NextResponse } from 'next/server'

const LARAVEL_INTERNAL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RawPoint = {
  lat?: number; lng?: number
  // PHP may send either canonical names (already mapped) or raw DB column names
  beds?: number; bedrooms?: number
  year?: number; yearbuilt?: number
  price?: number; soldprice_2?: number
  type?: string; class?: string
  subarea?: string; city?: string
}

function normalizePoint(p: RawPoint) {
  return {
    lat:     p.lat ?? 0,
    lng:     p.lng ?? 0,
    beds:    p.beds  ?? p.bedrooms  ?? 0,
    year:    p.year  ?? p.yearbuilt  ?? 0,
    price:   p.price ?? (typeof p.soldprice_2 === 'number' ? p.soldprice_2 : parseFloat(String(p.soldprice_2 ?? '0')) || 0),
    type:    p.type  ?? p.class ?? '',
    subarea: p.subarea ?? '',
    city:    p.city ?? '',
  }
}

export async function GET(req: NextRequest) {
  const days = req.nextUrl.searchParams.get('days') ?? '60'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST
  try {
    const res = await fetch(`${LARAVEL_INTERNAL_URL}/api-internal/residencity/heatmap?days=${days}`, {
      headers,
      signal: AbortSignal.timeout(12000),
    })
    const raw: RawPoint[] = await res.json()
    const data = Array.isArray(raw) ? raw.map(normalizePoint) : []
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
