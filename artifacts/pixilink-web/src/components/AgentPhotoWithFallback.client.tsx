'use client'

import { useState } from 'react'

interface Props {
  src: string
  alt: string
  style?: React.CSSProperties
  width?: number
  height?: number
  fallbackSrc?: string
}

export default function AgentPhotoWithFallback({ src, alt, style, width, height, fallbackSrc }: Props) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      style={style}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}
