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

export interface CoverageBucket {
  generated: number
  remaining: number
}

export interface BuildingCoverage {
  total: number
  cities: string[]
  subarea_whitelist_count: number
  description: CoverageBucket
  features: CoverageBucket
  tags: CoverageBucket
}

/**
 * Generation coverage for one agent's buildings — total, generated and
 * remaining per mode. Backs the progress header on the batch-generate page.
 *
 * Accepts agentId directly, or agentSlug which is resolved to an id first
 * (mirroring /api/admin/buildings).
 */
export async function GET(req: NextRequest) {
  let session
  try {
    session = await getAdminSession()
  } catch {}
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const agentSlug = searchParams.get('agentSlug') || ''
  let agentId = searchParams.get('agentId') || ''

  if (!agentId && agentSlug) {
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

  if (!agentId) {
    return NextResponse.json({ error: 'An agentId or a resolvable agentSlug is required' }, { status: 400 })
  }

  try {
    const r = await fetch(`${LARAVEL_URL}/api-internal/admin/agents/${agentId}/buildings/stats`, {
      headers: laravelHeaders(),
      cache: 'no-store',
    })
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      return NextResponse.json({ error: 'Upstream error', detail: body }, { status: r.status })
    }
    return NextResponse.json(await r.json())
  } catch {
    return NextResponse.json({ error: 'Failed to fetch building coverage' }, { status: 500 })
  }
}
