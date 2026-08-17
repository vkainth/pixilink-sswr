import { NextRequest, NextResponse } from 'next/server'
import { getAgentPortalSession } from '@/lib/agent-portal-auth'

/**
 * Agent portal proxy for lead property views.
 * Uses the same env/header contract as agent-portal-api.ts:
 *   LARAVEL_API_URL, LARAVEL_API_HOST, ADMIN_API_SECRET
 *
 * Ownership is enforced on the Laravel side: getLeadPropertyViews() checks
 * agent_leads to confirm this userId belongs to the requesting agent before
 * returning data; returns 403 if not.
 */

const LARAVEL_URL    = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST   = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET   = process.env.ADMIN_API_SECRET || ''

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getAgentPortalSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const uid = Number(userId)
  if (!uid || !Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST

  const res = await fetch(
    `${LARAVEL_URL}/api-internal/admin/leads/${uid}/property-views?agent_id=${session.id}`,
    { headers, next: { revalidate: 0 } }
  ).catch(() => null)

  if (!res) return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({ error: res.status === 403 ? 'Forbidden' : 'Unauthorized' }, { status: res.status })
  }
  if (!res.ok) {
    return NextResponse.json({ error: `Backend error ${res.status}` }, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
