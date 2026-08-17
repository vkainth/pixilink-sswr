import { NextRequest, NextResponse } from 'next/server'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* no body */ }

  const token = (body.token as string) || ''
  if (!token) {
    return NextResponse.json({ error: 'Missing verification token.' }, { status: 422 })
  }

  try {
    const res = await fetch(`${LARAVEL}/api-internal/auth/verify-email?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 })
  }
}
