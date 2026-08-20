'use client'

import { useEffect } from 'react'

/**
 * Scroll reveals for the showcase surfaces.
 *
 * One observer for the whole page rather than a wrapper component per element:
 * server components opt in with a plain `data-sc-reveal` attribute, so nothing has to
 * become a client component and no props are threaded through the tree.
 *
 * The hidden state lives in CSS behind `prefers-reduced-motion: no-preference`
 * (globals.css), which is what makes this safe:
 *
 *   - reduced-motion users never get the hidden state at all, so there is nothing to
 *     reveal and nothing to go wrong;
 *   - a <noscript> rule forces everything visible when JS is off;
 *   - if this component somehow fails to mount, the same noscript-style guard cannot
 *     help, so the observer is deliberately trivial and dependency-free.
 *
 * Elements already on screen at mount are revealed on the first callback, which fires
 * immediately, so above-the-fold content does not sit hidden waiting for a scroll.
 */
export default function MotionReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-sc-reveal]'))
    if (nodes.length === 0) return

    // Match the CSS guard exactly. If the user prefers reduced motion the CSS never hid
    // anything, so marking elements revealed would be harmless but pointless.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (typeof IntersectionObserver === 'undefined') {
      // No observer (very old browser): show everything rather than leave it hidden.
      nodes.forEach(n => n.classList.add('is-revealed'))
      return
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target as HTMLElement
        // Stagger siblings so a grid resolves in sequence rather than all at once.
        const delay = Number(el.dataset.scRevealDelay ?? 0)
        if (delay > 0) el.style.transitionDelay = `${delay}ms`
        el.classList.add('is-revealed')
        io.unobserve(el)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 })

    nodes.forEach(n => io.observe(n))
    return () => io.disconnect()
  }, [])

  return null
}
