import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { updateAdminAreaComparison, deleteAdminAreaComparison } from '@/lib/admin-api'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; comparisonId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, comparisonId } = await params
  try {
    const data = await req.json()
    const comparison = await updateAdminAreaComparison(Number(id), Number(comparisonId), data)
    return NextResponse.json(comparison)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; comparisonId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, comparisonId } = await params
  const ok = await deleteAdminAreaComparison(Number(id), Number(comparisonId))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
