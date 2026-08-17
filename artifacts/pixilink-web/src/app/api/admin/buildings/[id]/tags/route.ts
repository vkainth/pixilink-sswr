import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL   = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const ADMIN_SECRET  = process.env.ADMIN_API_SECRET || ''

// Admin endpoints must NOT use LARAVEL_API_HOST (website.pixilink.com) — that host
// triggers a Laravel redirect, returning HTML instead of JSON and silently failing saves.
const ADMIN_HOST = process.env.ADMIN_LARAVEL_HOST ?? null

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type':  'application/json',
    Accept:          'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (ADMIN_HOST) h['Host'] = ADMIN_HOST
  return h
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid building id' }, { status: 400 })
  }

  let body: { tags?: unknown }
  try { body = await req.json() } catch { body = {} }

  const tags = Array.isArray(body.tags) ? body.tags : []

  try {
    const r = await fetch(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/tags`, {
      method: 'POST',
      headers: laravelHeaders(),
      body: JSON.stringify({ tags }),
      cache: 'no-store',
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return NextResponse.json({ error: (data as { error?: string }).error || 'Upstream error' }, { status: r.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to save tags' }, { status: 500 })
  }
}
