import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/admin-auth'
import type { FeaturesPayload } from '../generate-features/route'

const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await getAdminSession()
  } catch {}
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json() as { type: string; sections: FeaturesPayload['sections']; agentSlug?: string; buildingSlug?: string }
    if (!Array.isArray(body.sections) || body.sections.length === 0) {
      return NextResponse.json({ error: 'sections array is required' }, { status: 400 })
    }

    const payload: FeaturesPayload = {
      type: (body.type === 'plain' ? 'plain' : body.type === 'web_sourced' ? 'web_sourced' : 'ai_generated'),
      sections: body.sections,
    }

    const res = await fetch(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/features`, {
      method: 'POST',
      headers: laravelHeaders(),
      body: JSON.stringify({ features_json: JSON.stringify(payload) }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: 'Laravel save failed', detail: err }, { status: res.status })
    }

    // Bust Next.js page cache so the building page shows fresh features immediately
    if (body.agentSlug && body.buildingSlug) {
      revalidatePath(`/agent/${body.agentSlug}/building/${body.buildingSlug}`)
    }

    return NextResponse.json({ id: Number(id), saved: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Save failed: ${message}` }, { status: 500 })
  }
}
