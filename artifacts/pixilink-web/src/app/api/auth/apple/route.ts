import { NextRequest, NextResponse } from 'next/server'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || ''
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

/** Only allow relative paths as return_to to prevent open-redirect attacks. */
function sanitizeReturnTo(raw: string | null, slug: string): string {
  if (!raw) return `${BASE}/agent/${slug}`
  if (!raw.startsWith('/') || raw.startsWith('//')) return `${BASE}/agent/${slug}`
  return raw
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('agent_slug') || ''
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'), slug)

  if (!slug) {
    return NextResponse.json({ error: 'Missing agent_slug' }, { status: 400 })
  }

  let laravelRes: Response
  try {
    laravelRes = await fetch(
      `${LARAVEL}/api-internal/auth/apple/redirect?slug=${encodeURIComponent(slug)}`,
    )
  } catch {
    return NextResponse.redirect(
      new URL(`${BASE}/agent/${slug}/sign-in?apple_error=service_unavailable`, req.url),
    )
  }

  const data = (await laravelRes.json()) as { url?: string; error?: string }

  if (!laravelRes.ok || !data.url) {
    return NextResponse.redirect(
      new URL(`${BASE}/agent/${slug}/sign-in?apple_error=not_configured`, req.url),
    )
  }

  // Store slug + return_to so the complete route can issue correct error redirects
  // and restore the user's intended destination after the cross-domain round-trip
  // through website.pixilink.com (the central Apple OAuth callback domain).
  const cookiePayload = JSON.stringify({ slug, returnTo })

  const response = NextResponse.redirect(data.url)
  response.cookies.set('pxl_apple_ctx', cookiePayload, {
    maxAge: 600,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return response
}
