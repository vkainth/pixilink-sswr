import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/admin-api'
import { signAdminJwt, ADMIN_COOKIE_NAME } from '@/lib/admin-auth'
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

    const admin = await adminAuth(email, password)

    if (!admin) {
      recordFailure(ip)
      const remaining = limit.remaining - 1
      const msg = remaining > 0
        ? `Invalid email or password (${remaining} attempt${remaining !== 1 ? 's' : ''} remaining)`
        : 'Invalid email or password — account locked for 15 minutes'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    recordSuccess(ip)

    const token = await signAdminJwt({ id: admin.id, name: admin.name, email: admin.email })

    const res = NextResponse.json({ success: true, name: admin.name })
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
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
