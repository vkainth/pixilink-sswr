import { NextResponse } from 'next/server'
import { AGENT_PORTAL_COOKIE } from '@/lib/agent-portal-auth'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(AGENT_PORTAL_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return res
}
