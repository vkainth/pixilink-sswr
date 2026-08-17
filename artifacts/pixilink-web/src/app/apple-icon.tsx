import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#14213d',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
        }}
      >
        <span style={{ color: '#c9a84c', fontSize: 110, fontWeight: 800, fontFamily: 'sans-serif' }}>P</span>
      </div>
    ),
    { ...size }
  )
}
