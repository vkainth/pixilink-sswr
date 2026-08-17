import { NextRequest, NextResponse } from 'next/server'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; listingSlug: string }> },
) {
  const { slug, listingSlug } = await params
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

  try {
    const res = await fetch(
      `${LARAVEL}/api-internal/agent/${slug}/listing/${listingSlug}/building-compelling-sold`,
      { headers, cache: 'no-store' },
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend error: ${res.status}` },
        { status: res.status },
      )
    }
    const data = await res.json()
    // null means no compelling sold found — still 200, client handles gracefully
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Service unavailable: ${err instanceof Error ? err.message : String(err)}` },
      { status: 503 },
    )
  }
}
