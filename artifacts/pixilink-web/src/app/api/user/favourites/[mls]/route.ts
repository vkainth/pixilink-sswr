import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ mls: string }> }) {
  const jar = await cookies()
  const token = jar.get(SESSION)?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mls } = await params
  try {
    const res = await fetch(`${LARAVEL}/api-internal/favourites/${encodeURIComponent(mls)}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
