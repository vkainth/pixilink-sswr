import { NextRequest, NextResponse } from 'next/server'

const LARAVEL_INTERNAL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST
  try {
    const body = await req.json()
    const res = await fetch(`${LARAVEL_INTERNAL_URL}/api-internal/residencity/subscribe`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
