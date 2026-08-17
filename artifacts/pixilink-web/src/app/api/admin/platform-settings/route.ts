import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/admin-api'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getPlatformSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ok = await updatePlatformSettings({ global_noindex: Boolean(body.global_noindex) })
  if (!ok) return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
