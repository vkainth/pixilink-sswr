import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const ALLOWED_ORIGIN = 'https://website.pixilink.com'
const ALLOWED_PATH_PREFIX = '/storage/'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const src = searchParams.get('src')
  const wParam = searchParams.get('w')

  if (!src) {
    return new NextResponse('Missing src param', { status: 400 })
  }

  let srcUrl: URL
  try {
    srcUrl = new URL(src)
  } catch {
    return new NextResponse('Invalid src URL', { status: 400 })
  }

  if (
    srcUrl.origin !== ALLOWED_ORIGIN ||
    !srcUrl.pathname.startsWith(ALLOWED_PATH_PREFIX)
  ) {
    return new NextResponse('Forbidden origin', { status: 403 })
  }

  const w = Math.min(Math.max(parseInt(wParam ?? '72', 10) || 72, 16), 400)

  // fit=width preserves the source aspect ratio; the default squares the image.
  //
  // The square crop exists for agent.headshot_path, which is a purpose-made square
  // portrait. agent.photo_path is a TALL portrait (Randy's is 800x1200) whose framing is
  // done in CSS via objectFit/objectPosition — squaring it server-side with centre gravity
  // would crop through the subject's face and silently re-frame every avatar on the site.
  // So callers resizing a photo_path pass fit=width and get the byte saving without any
  // change to composition.
  const fitWidth = searchParams.get('fit') === 'width'

  let imageBuffer: ArrayBuffer
  try {
    const res = await fetch(srcUrl.toString(), {
      headers: { Accept: 'image/*' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      return new NextResponse('Upstream fetch failed', { status: 502 })
    }
    imageBuffer = await res.arrayBuffer()
  } catch {
    return new NextResponse('Upstream fetch error', { status: 502 })
  }

  let webpArrayBuffer: ArrayBuffer
  try {
    const buf = await sharp(Buffer.from(imageBuffer))
      .resize(
        fitWidth
          ? { width: w, withoutEnlargement: true }
          : { width: w, height: w, fit: 'cover', withoutEnlargement: true },
      )
      .webp({ quality: 82 })
      .toBuffer()
    webpArrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  } catch {
    return new NextResponse('Image processing error', { status: 500 })
  }

  return new NextResponse(webpArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
