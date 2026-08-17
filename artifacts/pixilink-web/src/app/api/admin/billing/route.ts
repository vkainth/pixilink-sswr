import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { adminBillingList } from '@/lib/admin-api'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await adminBillingList()
  return NextResponse.json(data)
}
