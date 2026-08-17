import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function adminHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const type = req.nextUrl.searchParams.get('type') ?? ''
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''

  const res = await fetch(`${LARAVEL_URL}/api-internal/admin/agents/${id}/ai-pages${qs}`, {
    headers: adminHeaders(),
  })

  const data = await res.json().catch(() => [])
  return NextResponse.json(data, { status: res.status })
}
