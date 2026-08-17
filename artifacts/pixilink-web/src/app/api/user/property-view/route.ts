import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'

export async function POST(req: NextRequest) {
  const jar = await cookies()
  const token = jar.get(SESSION)?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const res = await fetch(`${LARAVEL}/api-internal/user/property-view`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    // Best-effort — return 200 even on server errors so the client never retries
    return NextResponse.json({ ok: res.ok }, { status: 200 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
