import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '../_ip'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const SESSION = 'pxl_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90 // 90 days

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Belt-and-suspenders: validate phone before proxying to Laravel.
  // Strips non-digits and requires at least 7 digits so direct API callers
  // get the same rejection as users who bypass the browser form.
  const rawPhone = typeof body.phone === 'string' ? body.phone : ''
  const phoneDigits = rawPhone.replace(/\D/g, '')
  if (phoneDigits.length < 7) {
    return NextResponse.json(
      {
        message: 'The given data was invalid.',
        errors: { phone: ['A valid phone number (at least 7 digits) is required to create an account.'] },
      },
      { status: 422 },
    )
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost'
  const cfVisitor = req.headers.get('cf-visitor') || ''
  const proto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
    || (cfVisitor.includes('"scheme":"https"') ? 'https' : 'http')
  const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const slug = (body.agent_slug as string) || ''
  const domainMode = process.env.AGENT_ROUTING_MODE === 'domain'
  const app_url = domainMode
    ? `${proto}://${host}${base}`
    : `${proto}://${host}${base}/agent/${slug}`

  let laravelRes: Response
  try {
    laravelRes = await fetch(`${LARAVEL}/api-internal/auth/register-passwordless`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Forwarded-For': clientIp(req) },
      body: JSON.stringify({ ...body, app_url }),
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
    maxAge: COOKIE_MAX_AGE,
  })
  return response
}
