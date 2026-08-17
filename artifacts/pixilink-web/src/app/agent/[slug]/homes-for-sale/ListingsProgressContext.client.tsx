'use client'

import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react'

interface ProgressCtx {
  signal: (pending: boolean) => void
}

const Ctx = createContext<ProgressCtx>({ signal: () => {} })
export const useListingsProgress = () => useContext(Ctx)

type Phase = 'idle' | 'running' | 'completing'

/**
 * Provides a shared loading bar for all filter navigations on listing pages.
 * Any client component (FilterDropdowns, FilterNavLink) calls signal(true/false)
 * to start/stop the bar. Multiple concurrent signals are ref-counted so the bar
 * stays up until every pending navigation resolves.
 *
 * Animation:
 *   running    → width 0 → 85% (2s ease-out) — indeterminate fill
 *   completing → width → 100% (0.2s) → fade out → idle
 */
export function ListingsProgressProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [width, setWidth] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const countRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const signal = useCallback((isPending: boolean) => {
    if (isPending) {
      countRef.current += 1
      setPhase('running')
    } else {
      countRef.current = Math.max(0, countRef.current - 1)
      if (countRef.current === 0) {
        setPhase('completing')
      }
    }
  }, [])

  useEffect(() => {
    clearTimer()
    if (phase === 'running') {
      // Reset to 0 first (no transition), then ramp to 85% with a transition
      setWidth(0)
      setOpacity(1)
      timerRef.current = setTimeout(() => setWidth(85), 16)
    } else if (phase === 'completing') {
      // Snap to 100%, then fade out
      setWidth(100)
      timerRef.current = setTimeout(() => {
        setOpacity(0)
        timerRef.current = setTimeout(() => {
          setPhase('idle')
          setWidth(0)
          setOpacity(1)
        }, 300)
      }, 200)
    }
    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <Ctx.Provider value={{ signal }}>
      {phase !== 'idle' && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            height: 3, pointerEvents: 'none',
            opacity,
            transition: opacity < 1 ? 'opacity 0.3s ease' : 'none',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--accent)',
              width: `${width}%`,
              transition: width === 0 ? 'none'
                : width === 85 ? 'width 2s ease-out'
                : 'width 0.2s ease-out',
            }}
          />
        </div>
      )}
      {children}
    </Ctx.Provider>
  )
}
