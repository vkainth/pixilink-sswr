'use client'

import { useState } from 'react'

interface Props {
  src: string
  name: string
  objectPosition?: string
}

export default function HeroPhotoCircle({ src, name, objectPosition = '50% 8%' }: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div style={{ width: 150, height: 150, borderRadius: '50%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 700, color: '#999', marginBottom: 14, flexShrink: 0, border: '3px solid var(--accent)' }}>
        {name.charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', objectPosition, border: '3px solid var(--accent)', marginBottom: 14, flexShrink: 0 }}
    />
  )
}
