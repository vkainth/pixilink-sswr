import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getAdminTestimonials, createAdminTestimonial, AdminApiError } from '@/lib/admin-api'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  return NextResponse.json(await getAdminTestimonials(Number(id)))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const created = await createAdminTestimonial(Number(id), await req.json())
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    // Pass Laravel's 422 body straight through so the form can name the offending
    // field, instead of flattening every failure into a generic 500.
    if (e instanceof AdminApiError) return NextResponse.json(e.body, { status: e.status })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}
