import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * On-demand revalidation endpoint.
 *
 * Call after deploying a fix to force Next.js to drop a stale ISR cache entry:
 *
 *   curl -X POST "https://<domain>/api/revalidate?path=/top-realtor/south-surrey/ocean-park&secret=<REVALIDATE_SECRET>"
 *
 * The REVALIDATE_SECRET env var must be set in the Docker container (add -e REVALIDATE_SECRET=... to the run command).
 * If the env var is not set the endpoint is disabled and returns 403.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Revalidation not configured' }, { status: 403 })
  }

  const provided = req.nextUrl.searchParams.get('secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const path = req.nextUrl.searchParams.get('path')
  if (!path || !path.startsWith('/')) {
    return NextResponse.json({ error: 'path param required (must start with /)' }, { status: 400 })
  }

  revalidatePath(path)
  return NextResponse.json({ revalidated: true, path })
}
