'use client'

import { useEffect } from 'react'

/**
 * A small, capped parallax drift on the hero image.
 *
 * Deliberately conservative — parallax is the effect most likely to feel cheap or to
 * jank, so this one:
 *
 *   - moves at most MAX_SHIFT px, no matter how far the page scrolls;
 *   - only runs while the hero is actually on screen (an IntersectionObserver gates the
 *     scroll listener, so scrolling the rest of a long page costs nothing);
 *   - reads scroll position inside requestAnimationFrame rather than in the scroll
 *     handler, so it never forces layout on the scroll thread;
 *   - is off entirely under prefers-reduced-motion and on narrow screens, where the
 *     hero is short, the effect is invisible, and touch scrolling suffers most.
 *
 * The element keeps its own object-position; only a transform is applied, which the
 * compositor can handle without repainting.
 */
// Total travel, split evenly either side of centre so the image never runs short of
// its frame. SCALE gives the overlap that hides the edges: at a 700px strip, 1.08 buys
// 28px top and bottom, comfortably more than the 24px of drift each way.
const MAX_SHIFT = 48
const SCALE = 1.08

export default function HeroParallax() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-sc-parallax]')
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(max-width: 900px)').matches) return
    if (typeof IntersectionObserver === 'undefined') return

    let visible = false
    let queued = false

    const apply = () => {
      queued = false
      const rect = el.getBoundingClientRect()
      const travel = rect.height + window.innerHeight
      if (travel <= 0) return
      // 0 when the hero's top first meets the viewport bottom, 1 when it has fully left.
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / travel))
      // Centre the range on 0 so the drift is symmetrical rather than one-directional.
      const shift = (progress - 0.5) * MAX_SHIFT
      el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale(${SCALE})`
    }

    const onScroll = () => {
      if (!visible || queued) return
      queued = true
      requestAnimationFrame(apply)
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) onScroll()
      else {
        // Keep the scale so it does not visibly snap when it leaves the viewport.
        el.style.transform = `scale(${SCALE})`
      }
    }, { threshold: 0 })

    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    apply()

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      el.style.transform = ''
    }
  }, [])

  return null
}
