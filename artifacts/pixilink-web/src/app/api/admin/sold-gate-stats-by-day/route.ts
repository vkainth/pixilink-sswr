import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getSoldGateStatsByDay } from '@/lib/admin-api'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const stats = await getSoldGateStatsByDay(days)
  return NextResponse.json(stats)
}
