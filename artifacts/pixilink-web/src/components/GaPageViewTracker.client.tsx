'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Fires a GA4 `page_view` event on every client-side route change.
 *
 * `next/script strategy="afterInteractive"` only runs once on the initial hard
 * load. Every soft navigation (listing clicks, filter changes, back-navigation)
 * in Next.js App Router would otherwise fire zero GA4 page views. This component
 * listens to pathname AND search-param changes via usePathname()/useSearchParams()
 * and sends the event manually, matching the behaviour GA4's automatic page_view
 * would have in a traditional MPA.
 *
 * WHY BOTH HOOKS: many filter interactions (price, sort, suite toggles) navigate
 * via router.push(pathname + '?filter=...'), which keeps the pathname identical.
 * Tracking only usePathname() silently drops every query-param-only navigation.
 *
 * The Suspense wrapper is required because useSearchParams() opts the subtree out
 * of static rendering — without it Next.js throws at build time.
 *
 * The guard on `typeof window.gtag === 'function'` ensures we never call gtag
 * before the GA loader script has executed (e.g. on first render before
 * afterInteractive fires).
 */
function GaPageViewTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window.gtag !== 'function') return
    const qs = searchParams.toString()
    const pagePath = qs ? `${pathname}?${qs}` : pathname
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: document.title,
    })
  }, [pathname, searchParams])

  return null
}

export default function GaPageViewTracker() {
  return (
    <Suspense fallback={null}>
      <GaPageViewTrackerInner />
    </Suspense>
  )
}
