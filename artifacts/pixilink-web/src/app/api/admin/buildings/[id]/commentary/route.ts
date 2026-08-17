import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL   = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST  = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET  = process.env.ADMIN_API_SECRET || ''

const FIELD_KEYS = [
  'agent_take_desirability',
  'agent_take_buyer_profile',
  'agent_take_common_problems',
  'agent_take_value_take',
  'agent_take_best_floorplans',
  'agent_take_view_preference',
  'agent_take_noise_notes',
  'agent_take_rental_pet_appeal',
] as const

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type':  'application/json',
    Accept:          'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid building id' }, { status: 400 })
  }

  try {
    const r = await fetch(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/commentary`, {
      method: 'GET',
      headers: laravelHeaders(),
      cache: 'no-store',
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return NextResponse.json({ error: (data as { error?: string }).error || 'Upstream error' }, { status: r.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to load commentary' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid building id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { body = {} }

  const payload: Record<string, string> = {}
  for (const key of FIELD_KEYS) {
    if (key in body) payload[key] = typeof body[key] === 'string' ? body[key] : ''
  }

  try {
    const r = await fetch(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/commentary`, {
      method: 'POST',
      headers: laravelHeaders(),
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return NextResponse.json({ error: (data as { error?: string }).error || 'Upstream error' }, { status: r.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to save commentary' }, { status: 500 })
  }
}
