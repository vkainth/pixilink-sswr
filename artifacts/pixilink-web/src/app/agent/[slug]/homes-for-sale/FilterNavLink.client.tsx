'use client'

/**
 * FilterNavLink — a client-side navigation wrapper for filter chip <a> tags
 * in ListingsCore (server component). Intercepts left-clicks to use router.push()
 * inside startTransition, which signals the ListingsProgressBar to animate.
 *
 * Keeps <a href> intact for right-click / open-in-new-tab / crawler indexability.
 */

import { useRouter } from 'next/navigation'
import { useTransition, useEffect } from 'react'
import { useListingsProgress } from './ListingsProgressContext.client'

interface Props {
  href: string
  style?: React.CSSProperties
  className?: string
  children: React.ReactNode
}

export default function FilterNavLink({ href, style, className, children }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { signal } = useListingsProgress()

  useEffect(() => {
    signal(isPending)
  }, [isPending, signal])

  return (
    <a
      href={href}
      style={style}
      className={className}
      onClick={(e) => {
        // Only intercept plain left-clicks — let modifier-key combos through
        // so ctrl/cmd+click still opens in a new tab.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        startTransition(() => router.push(href))
      }}
    >
      {children}
    </a>
  )
}
