import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '../_ip'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* no body */ }

  try {
    const res = await fetch(`${LARAVEL}/api-internal/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Forwarded-For': clientIp(req) },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 })
  }
}
