'use client'

import { useEffect, useRef, useState } from 'react'

export default function StickyFilterWrapper({ children }: { children: React.ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const NAV_HEIGHT = 58
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: `-${NAV_HEIGHT + 1}px 0px 0px 0px`, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" style={{ height: 1, pointerEvents: 'none' }} />
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          padding: '16px 0',
          position: 'sticky',
          top: 'var(--nav-height)',
          zIndex: 30,
          transition: 'box-shadow 0.15s ease',
          boxShadow: isStuck ? '0 2px 10px rgba(0,0,0,0.10)' : 'none',
        }}
      >
        <div className="container">
          {children}
        </div>
      </div>
    </>
  )
}
