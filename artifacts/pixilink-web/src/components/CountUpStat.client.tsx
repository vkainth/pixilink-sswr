'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Counts a stat up to its final value once it scrolls into view.
 *
 * Takes the already-formatted string the server rendered (e.g. "43+", "$69.7M", "98%")
 * and animates only the leading number, replaying whatever prefix and suffix came with
 * it. That keeps every formatting decision — currency, compaction, the trailing plus —
 * in one place on the server instead of duplicating it here.
 *
 * The final value is the initial state, so:
 *   - reduced-motion users see the real number and nothing ever moves;
 *   - no-JS renders the real number server-side;
 *   - a mid-animation navigation leaves a correct figure on screen.
 */
export default function CountUpStat({ value, ms = 1100 }: { value: string; ms?: number }) {
  const [shown, setShown] = useState(value)
  const ref = useRef<HTMLSpanElement | null>(null)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || done.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof IntersectionObserver === 'undefined') return

    // Split "≈$69.7M" into prefix / number / suffix. Bail out when there is no number to
    // animate (a stat rendered as an em dash, say) rather than showing a stray 0.
    const m = value.match(/^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/)
    if (!m) return
    const [, prefix, numRaw, suffix] = m
    const target = parseFloat(numRaw.replace(/,/g, ''))
    if (!isFinite(target)) return
    const decimals = numRaw.includes('.') ? (numRaw.split('.')[1]?.length ?? 0) : 0
    const grouped = numRaw.includes(',')

    const fmt = (n: number) => {
      const fixed = n.toFixed(decimals)
      const out = grouped ? Number(fixed).toLocaleString('en-CA', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }) : fixed
      return `${prefix}${out}${suffix}`
    }

    const io = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting) || done.current) return
      done.current = true
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms)
        // easeOutCubic — fast off the mark, settles rather than stopping dead.
        const eased = 1 - Math.pow(1 - t, 3)
        setShown(fmt(target * eased))
        if (t < 1) requestAnimationFrame(tick)
        else setShown(value)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.2 })

    io.observe(el)
    return () => io.disconnect()
  }, [value, ms])

  // tabular-nums stops the width jittering as the digits change.
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{shown}</span>
}
