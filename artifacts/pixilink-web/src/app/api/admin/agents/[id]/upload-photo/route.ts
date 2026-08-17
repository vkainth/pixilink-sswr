import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const formData = await req.formData()
  const file = formData.get('photo') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const laravelFormData = new FormData()
  laravelFormData.append('photo', file)

  const headers: Record<string, string> = {
    'X-Admin-Secret': ADMIN_SECRET,
    'Accept': 'application/json',
  }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

  const res = await fetch(`${LARAVEL_URL}/api-internal/admin/agents/${id}/upload-photo`, {
    method: 'POST',
    headers,
    body: laravelFormData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: (err as Record<string, string>).error || 'Upload failed' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
