import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

  const res = await fetch(`${LARAVEL_URL}/api-internal/admin/test-ghl-push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ agent_id: Number(id) }),
  })

  const data = await res.json().catch(() => ({ ok: false, reason: 'invalid_response' }))
  return NextResponse.json(data, { status: res.status })
}
