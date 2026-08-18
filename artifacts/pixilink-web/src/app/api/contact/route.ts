import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

const CONTACT_MAX = 5
const CONTACT_WINDOW_MS = 10 * 60 * 1000

// Lightweight lead-capture offers (Task #1950) — email-only, no name required.
const OFFER_FORM_TYPES = new Set([
  'weekly_deals',
  'price_drop',
  'building_sold',
  'neighbour_sold',
  'school_catchment',
  'building_valuation',
])

export async function POST(request: Request) {
  const ip = getClientIp(request)

  if (rateLimit(ip, 'contact', CONTACT_MAX, CONTACT_WINDOW_MS)) {
    return NextResponse.json(
      { success: false, error: 'Too many submissions. Please wait a few minutes before trying again.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { agent_slug = 'randy', ...data } = body

    const name = (data.name ?? '').toString().trim()
    const isOffer = OFFER_FORM_TYPES.has((data.form_type ?? '').toString())

    if (!name && !isOffer) {
      return NextResponse.json(
        { success: false, error: 'Name is required.' },
        { status: 400 }
      )
    }

    if (isOffer) {
      const email = (data.email ?? '').toString().trim()
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Email is required.' },
          { status: 400 }
        )
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

    const res = await fetch(`${LARAVEL_URL}/api-internal/agent/${agent_slug}/contact`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    // Forward 422 (validation/spam) and 429 (rate-limit) so clients can show the right message.
    // Other upstream errors collapse to 500.
    let errBody: { error?: string } = {}
    try { errBody = await res.json() } catch { /* ignore parse failure */ }
    const upstreamStatus = res.status
    console.error('Contact Laravel error:', upstreamStatus, errBody)
    if (upstreamStatus === 422 || upstreamStatus === 429) {
      return NextResponse.json(
        { success: false, error: errBody.error ?? 'Submission rejected.' },
        { status: upstreamStatus }
      )
    }
    return NextResponse.json({ success: false, error: 'Submission failed' }, { status: 500 })
  } catch (e) {
    console.error('Contact route error:', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
