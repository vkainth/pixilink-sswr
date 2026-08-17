import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authMe } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const jar = await cookies()
  const token = jar.get('pxl_session')?.value
  if (!token) return NextResponse.json({ user: null })
  const user = await authMe(token)
  return NextResponse.json({ user })
}
