import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '../_ip'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const remember = Boolean(body.remember)
  const maxAge = remember ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 30

  let laravelRes: Response
  try {
    laravelRes = await fetch(`${LARAVEL}/api-internal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Forwarded-For': clientIp(req) },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ error: 'Service unavailable. Please try again.' }, { status: 503 })
  }

  const data = await laravelRes.json()

  if (!laravelRes.ok) {
    return NextResponse.json(data, { status: laravelRes.status })
  }

  const response = NextResponse.json(data)
  response.cookies.set(SESSION, data.token as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
  return response
}
