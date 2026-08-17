import { NextRequest, NextResponse } from 'next/server'
import { clientIp } from '../_ip'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* no body */ }

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

  try {
    const res = await fetch(`${LARAVEL}/api-internal/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Forwarded-For': clientIp(req) },
      body: JSON.stringify({ ...body, app_url }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 })
  }
}
