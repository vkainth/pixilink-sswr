import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { updateAdminTestimonial, deleteAdminTestimonial, AdminApiError } from '@/lib/admin-api'

type Ctx = { params: Promise<{ id: string; testimonialId: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, testimonialId } = await params
  try {
    const updated = await updateAdminTestimonial(Number(id), Number(testimonialId), await req.json())
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AdminApiError) return NextResponse.json(e.body, { status: e.status })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, testimonialId } = await params
  const ok = await deleteAdminTestimonial(Number(id), Number(testimonialId))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
