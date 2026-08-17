import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { updateAdminLandingPage, deleteAdminLandingPage } from '@/lib/admin-api'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, pageId } = await params
  try {
    const data = await req.json()
    const page = await updateAdminLandingPage(Number(id), Number(pageId), data)
    return NextResponse.json(page)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, pageId } = await params
  const ok = await deleteAdminLandingPage(Number(id), Number(pageId))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
