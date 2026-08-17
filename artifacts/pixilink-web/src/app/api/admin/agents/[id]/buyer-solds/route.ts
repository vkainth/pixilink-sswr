import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function adminHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

async function laravelAdminFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${LARAVEL_URL}/api-internal/admin${path}`, {
    ...opts,
    headers: { ...adminHeaders(), ...((opts.headers as Record<string, string>) || {}) },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await laravelAdminFetch(`/agents/${id}/buyer-solds`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const res = await laravelAdminFetch(`/agents/${id}/buyer-solds`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: _agentId } = await params
  const { rowId } = await req.json()
  if (!rowId) return NextResponse.json({ error: 'rowId required' }, { status: 400 })

  const res = await laravelAdminFetch(`/agent-buyer-solds/${rowId}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({ deleted: true }))
  return NextResponse.json(data, { status: res.status })
}
