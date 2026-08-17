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
  const missingFeaturesOnly = searchParams.get('missing_features_only') === 'true' || searchParams.get('missing_features_only') === '1'

  let customDomain: string | null = null
  let layoutPreset: string | null = null

  // Resolve slug → id+customDomain when only agentId is known
  if (!agentSlug && agentId) {
    try {
      const r = await fetch(`${LARAVEL_URL}/api-internal/admin/agents/${agentId}`, {
        headers: laravelHeaders(),
        cache: 'no-store',
      })
      if (r.ok) {
        const a = await r.json()
        agentSlug = a.slug || ''
        customDomain = a.settings?.custom_domain || null
        layoutPreset = a.settings?.site_config?.layout_preset || null
      }
    } catch {}
  }

  // Resolve id+customDomain when only agentSlug is known
  if (agentSlug && !agentId) {
    try {
      const r = await fetch(`${LARAVEL_URL}/api-internal/agent/${agentSlug}`, {
        headers: laravelHeaders(),
        cache: 'no-store',
      })
      if (r.ok) {
        const a = await r.json()
        agentId = String(a.id || '')
        customDomain = a.settings?.custom_domain || null
        layoutPreset = a.settings?.site_config?.layout_preset || null
      }
    } catch {}
  }

  const tagParams = searchParams.getAll('tags[]')

  const routingMode = process.env.AGENT_ROUTING_MODE || 'domain'

  // No agent filter — global view: return all buildings across the platform
  if (!agentSlug) {
    try {
      const qs = new URLSearchParams({ limit: String(limit), page: String(page) })
      if (missingOnly) qs.set('missing_only', '1')
      if (missingFeaturesOnly) qs.set('missing_features_only', '1')
      tagParams.forEach(t => qs.append('tags[]', t))
      const r = await fetch(`${LARAVEL_URL}/api-internal/admin/buildings?${qs}`, {
        headers: laravelHeaders(),
        cache: 'no-store',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        return NextResponse.json({ error: 'Upstream error', detail: body }, { status: r.status })
      }
      const data = await r.json()
      return NextResponse.json({
        buildings: Array.isArray(data.buildings) ? data.buildings : [],
        agent_slug: null,
        custom_domain: null,
        routing_mode: routingMode,
        total: data.total ?? 0,
        page: data.page ?? page,
        limit: data.limit ?? limit,
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch global buildings' }, { status: 500 })
    }
  }

  // Agent-scoped view: use the dedicated admin endpoint (no public 48-item cap).
  // Falls back to the public slug endpoint only when agentId could not be resolved.

  try {
    const qs = new URLSearchParams({ limit: String(limit), page: String(page) })
    if (missingOnly) qs.set('missing_only', '1')
    if (missingFeaturesOnly) qs.set('missing_features_only', '1')
    tagParams.forEach(t => qs.append('tags[]', t))
    const adminEndpoint = agentId
      ? `${LARAVEL_URL}/api-internal/admin/agents/${agentId}/buildings?${qs}`
      : `${LARAVEL_URL}/api-internal/agent/${agentSlug}/buildings?${qs}`

    const r = await fetch(adminEndpoint, {
      headers: laravelHeaders(),
      cache: 'no-store',
    })

    if (!r.ok) {
      // Fall back to the public endpoint if the admin-specific one isn't deployed yet
      const fallback = await fetch(
        `${LARAVEL_URL}/api-internal/agent/${agentSlug}/buildings?${qs}`,
        { headers: laravelHeaders(), cache: 'no-store' },
      )
      if (!fallback.ok) {
        const body = await fallback.json().catch(() => ({}))
        return NextResponse.json({ error: 'Upstream error', detail: body }, { status: fallback.status })
      }
      const buildings = await fallback.json()
      return NextResponse.json({
        buildings: Array.isArray(buildings) ? buildings : [],
        agent_slug: agentSlug,
        custom_domain: customDomain,
        routing_mode: routingMode,
        layout_preset: layoutPreset,
      })
    }

    const data = await r.json()
    const buildings = Array.isArray(data) ? data : (Array.isArray(data.buildings) ? data.buildings : [])
    return NextResponse.json({
      buildings,
      agent_slug: agentSlug,
      custom_domain: customDomain,
      routing_mode: routingMode,
      layout_preset: layoutPreset,
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 })
  }
}
