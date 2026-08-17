import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'

export async function POST(req: NextRequest) {
  const jar = await cookies()
  const token = jar.get(SESSION)?.value

  if (token) {
    try {
      await fetch(`${LARAVEL}/api-internal/auth/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      // Best-effort — clear cookie regardless
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
