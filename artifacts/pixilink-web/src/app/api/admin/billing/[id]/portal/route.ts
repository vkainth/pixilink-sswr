import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { adminBillingEmailPortalUrl } from '@/lib/admin-api'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await adminBillingEmailPortalUrl(Number(id))
  if ('error' in result && !result.url) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ url: result.url })
}
