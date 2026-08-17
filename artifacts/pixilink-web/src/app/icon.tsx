import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 4,
        }}
      >
        <span style={{ color: '#c9a84c', fontSize: 22, fontWeight: 800, fontFamily: 'sans-serif' }}>P</span>
      </div>
    ),
    { ...size }
  )
}
