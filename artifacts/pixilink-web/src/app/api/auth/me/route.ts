import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'

export async function GET(_req: NextRequest) {
  const jar = await cookies()
  const token = jar.get(SESSION)?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  try {
    const res = await fetch(`${LARAVEL}/api-internal/auth/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return NextResponse.json({ user: null }, { status: 401 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ user: null }, { status: 503 })
  }
}
