import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getAgent, updateAgent } from '@/lib/admin-api'
import type { RawSiteConfig } from '@/lib/types'

const VALID_SHOWCASE_HERO_STYLES = ['split', 'fullbleed-cinematic', 'editorial-stack'] as const

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { showcase_hero_style } = body as { showcase_hero_style?: string }

  if (!showcase_hero_style || !VALID_SHOWCASE_HERO_STYLES.includes(showcase_hero_style as typeof VALID_SHOWCASE_HERO_STYLES[number])) {
    return NextResponse.json({ error: 'Invalid showcase_hero_style' }, { status: 400 })
  }

  const agent = await getAgent(Number(id))
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const current: RawSiteConfig = (agent.settings?.site_config as RawSiteConfig) ?? {}
  const updated: RawSiteConfig = { ...current, showcase_hero_style: showcase_hero_style as RawSiteConfig['showcase_hero_style'] }

  await updateAgent(Number(id), { site_config: JSON.stringify(updated) })

  return NextResponse.json({ ok: true, site_config: updated })
}
