import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { adminBillingManualReactivate } from '@/lib/admin-api'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ok = await adminBillingManualReactivate(Number(id))
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 502 })
}
