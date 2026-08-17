import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export async function GET(req: NextRequest) {
  let session
  try {
    session = await getAdminSession()
  } catch {}
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  let agentSlug = searchParams.get('agentSlug') || ''
  let agentId = searchParams.get('agentId') || ''
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || '100')))
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const missingOnly = searchParams.get('missing_only') === 'true' || searchParams.get('missing_only') === '1'

  // Resolve slug → id when only agentSlug is known
  if (agentSlug && !agentId) {
    try {
      const r = await fetch(`${LARAVEL_URL}/api-internal/agent/${agentSlug}`, {
        headers: laravelHeaders(),
        cache: 'no-store',
      })
      if (r.ok) {
        const a = await r.json()
        agentId = String(a.id || '')
      }
    } catch {}
  }

  try {
    const qs = new URLSearchParams({ limit: String(limit), page: String(page) })
    if (missingOnly) qs.set('missing_only', '1')

    const endpoint = agentId
      ? `${LARAVEL_URL}/api-internal/admin/agents/${agentId}/listings?${qs}`
      : `${LARAVEL_URL}/api-internal/admin/listings?${qs}`

    const r = await fetch(endpoint, { headers: laravelHeaders(), cache: 'no-store' })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      return NextResponse.json({ error: 'Upstream error', detail: body }, { status: r.status })
    }
    const data = await r.json()
    const rawListings: Array<Record<string, unknown>> = Array.isArray(data.listings) ? data.listings : []
    const listings = rawListings.map(l => ({ ...l, mls: l.listingid }))
    return NextResponse.json({
      listings,
      agent_slug: agentSlug || null,
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }
}
