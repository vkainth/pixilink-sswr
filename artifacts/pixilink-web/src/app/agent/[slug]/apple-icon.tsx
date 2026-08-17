import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { getAgent } from '@/lib/api'
import { imgUrl } from '@/lib/types'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export const revalidate = 3600

async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

async function readPublicFile(relativePath: string): Promise<ArrayBuffer | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', relativePath)
    const buf = await readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  } catch {
    return null
  }
}

export default async function AgentAppleIcon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = await getAgent(slug)

  const w = size.width
  const h = size.height

  const brandBg = agent?.primary_bg_color || '#14213d'
  const brandAccent = agent?.theme_color || '#c9a84c'
  const initial = agent?.name?.trim().charAt(0).toUpperCase() || 'A'

  const initialsEl = (
    <div
      style={{
        background: brandBg,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
      }}
    >
      <span style={{ color: brandAccent, fontSize: 100, fontWeight: 800, fontFamily: 'sans-serif' }}>
        {initial}
      </span>
    </div>
  )

  const faviconUrl = agent?.settings?.favicon_url ?? null
  const headshotPath = agent?.headshot_path ?? agent?.photo_path ?? null

  if (faviconUrl) {
    let imgBuf: ArrayBuffer | null = null
    if (faviconUrl.startsWith('/')) {
      const faviconApplePath = faviconUrl.replace(/-32\.png$/, '-180.png')
      imgBuf = await readPublicFile(faviconApplePath)
      if (!imgBuf) imgBuf = await readPublicFile(faviconUrl)
    } else if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
      imgBuf = await fetchImageBuffer(faviconUrl)
    }

    if (imgBuf) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: '#ffffff',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgBuf as unknown as string}
              width={w - 40}
              height={h - 40}
              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
              alt=""
            />
          </div>
        ),
        { ...size }
      )
    }
  }

  if (headshotPath) {
    const resolved = headshotPath.startsWith('http') ? headshotPath : imgUrl(headshotPath, 325)
    const imgBuf = await fetchImageBuffer(resolved)
    if (imgBuf) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              overflow: 'hidden',
              background: brandBg,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgBuf as unknown as string}
              width={w}
              height={h}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              alt=""
            />
          </div>
        ),
        { ...size }
      )
    }
  }

  return new ImageResponse(initialsEl, { ...size })
}
