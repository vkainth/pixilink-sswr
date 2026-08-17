import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL   = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST  = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET  = process.env.ADMIN_API_SECRET || ''

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type':  'application/json',
    Accept:          'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 })
  }

  let body: { tags?: unknown }
  try { body = await req.json() } catch { body = {} }

  const tags = Array.isArray(body.tags) ? body.tags : []

  try {
    const r = await fetch(`${LARAVEL_URL}/api-internal/admin/listings/${id}/tags`, {
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
