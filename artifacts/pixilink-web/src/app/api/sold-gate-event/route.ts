import { NextRequest, NextResponse } from 'next/server'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

    const res = await fetch(`${LARAVEL_URL}/api-internal/sold-gate-event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (res.ok) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false }, { status: res.status })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
