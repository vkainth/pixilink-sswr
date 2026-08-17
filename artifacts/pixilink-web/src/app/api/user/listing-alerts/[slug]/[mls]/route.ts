import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'

async function getToken(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(SESSION)?.value ?? null
}

/** Check subscription state */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; mls: string }> }) {
  const token = await getToken()
  if (!token) return NextResponse.json({ subscribed: false }, { status: 200 })

  const { slug, mls } = await params
  try {
    const res = await fetch(`${LARAVEL}/api-internal/agent/${slug}/listing-alerts/${encodeURIComponent(mls)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.status === 401) return NextResponse.json({ subscribed: false })
    if (!res.ok) return NextResponse.json({ subscribed: false })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ subscribed: false })
  }
}

/** Subscribe to listing alerts */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; mls: string }> }) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, mls } = await params
  try {
    const res = await fetch(`${LARAVEL}/api-internal/agent/${slug}/listing-alerts`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mls_num: mls }),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

/** Unsubscribe from listing alerts */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; mls: string }> }) {
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, mls } = await params
  try {
    const res = await fetch(`${LARAVEL}/api-internal/agent/${slug}/listing-alerts/${encodeURIComponent(mls)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
