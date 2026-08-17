import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { updateAdminBestOfList, deleteAdminBestOfList } from '@/lib/admin-api'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; listId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, listId } = await params
  try {
    const data = await req.json()
    const list = await updateAdminBestOfList(Number(id), Number(listId), data)
    return NextResponse.json(list)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; listId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, listId } = await params
  const ok = await deleteAdminBestOfList(Number(id), Number(listId))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
