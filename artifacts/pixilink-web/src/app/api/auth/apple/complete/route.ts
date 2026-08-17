import { NextRequest, NextResponse } from 'next/server'

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || ''
const SESSION = 'pxl_session'
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

function nextStepPath(slug: string, step: string): string {
  switch (step) {
    case 'verify_email':    return `${BASE}/agent/${slug}/verify-email`
    case 'complete_profile': return `${BASE}/agent/${slug}/complete-profile`
    case 'verify_phone':    return `${BASE}/agent/${slug}/verify-phone`
    case 'accept_terms':    return `${BASE}/agent/${slug}/accept-terms`
    default:               return `${BASE}/agent/${slug}`
  }
}

/**
 * GET /api/auth/apple/complete?code={exchangeCode}
 *
 * Final leg of the central Apple SIWA flow:
 *   1. User initiates on agent domain → /api/auth/apple sets pxl_apple_ctx cookie
 *   2. Apple redirects to website.pixilink.com/api-internal/auth/apple/callback (central)
 *   3. Laravel verifies Apple id_token, finds/creates user, generates a short-lived
 *      exchange code (5-min cache), then redirects to {agent_domain}/api/auth/apple/complete
 *   4. This route exchanges the code for a session token and sets pxl_session on
 *      the originating agent domain — no cross-domain cookie issue.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  // Parse the context cookie (slug + return_to) set before the OAuth round-trip
  let ctxSlug = ''
  let ctxReturnTo = ''
  try {
    const raw = req.cookies.get('pxl_apple_ctx')?.value || '{}'
    const ctx = JSON.parse(raw) as { slug?: string; returnTo?: string }
    ctxSlug = ctx.slug || ''
    ctxReturnTo = ctx.returnTo || ''
  } catch { /* leave as empty strings */ }

  const errorRedirect = (reason: string) => {
    const dest = ctxSlug
      ? `${BASE}/agent/${ctxSlug}/sign-in?apple_error=${reason}`
      : `${BASE}/`
    return NextResponse.redirect(new URL(dest, req.url))
  }

  if (!code) return errorRedirect('no_code')

  let laravelRes: Response
  try {
    laravelRes = await fetch(`${LARAVEL}/api-internal/auth/apple/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
  } catch {
    return errorRedirect('service_unavailable')
  }

  if (!laravelRes.ok) return errorRedirect('exchange_failed')

  const { token, next_step, slug } = (await laravelRes.json()) as {
    token: string
    next_step: string
    slug: string
  }

  const destination =
    next_step === 'done'
      ? (ctxReturnTo || nextStepPath(slug, next_step))
      : nextStepPath(slug, next_step)

  const response = NextResponse.redirect(new URL(destination, req.url))
  response.cookies.set(SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  response.cookies.delete('pxl_apple_ctx')
  return response
}
