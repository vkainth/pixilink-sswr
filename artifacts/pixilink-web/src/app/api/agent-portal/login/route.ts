import { NextRequest, NextResponse } from 'next/server'
import { agentPortalAuth } from '@/lib/agent-portal-api'
import { signAgentPortalJwt, AGENT_PORTAL_COOKIE } from '@/lib/agent-portal-auth'
import { checkLimit, recordFailure, recordSuccess, getClientIp } from '@/lib/login-rate-limiter'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = checkLimit(ip)

  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterMs / 60000)
    return NextResponse.json(
      { error: `Too many attempts — try again in ${minutes} minute${minutes !== 1 ? 's' : ''}` },
      { status: 429 }
    )
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const agent = await agentPortalAuth(email, password)

    if (!agent) {
      recordFailure(ip)
      const remaining = limit.remaining - 1
      const msg = remaining > 0
        ? `Invalid email or password (${remaining} attempt${remaining !== 1 ? 's' : ''} remaining)`
        : 'Invalid email or password — account locked for 15 minutes'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    recordSuccess(ip)

    const token = await signAgentPortalJwt({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      slug: agent.slug,
      theme_color: agent.theme_color,
      theme_slug: agent.theme_slug,
      domain: agent.domain,
    })

    const res = NextResponse.json({ success: true, name: agent.name })
    res.cookies.set(AGENT_PORTAL_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
