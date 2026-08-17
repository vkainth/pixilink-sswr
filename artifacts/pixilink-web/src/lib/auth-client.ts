'use client'

import { nextStepPath as _nextStepPath } from './next-step'

export { _nextStepPath as nextStepPath }

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
}

export function consumeReturnTo(fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const stored = sessionStorage.getItem('pxl_return_to')
  if (stored) {
    sessionStorage.removeItem('pxl_return_to')
    return stored
  }
  return fallback
}

/**
 * Read pxl_return_to without consuming it — safe to call before a form submit
 * so consumeReturnTo() still works for the post-registration redirect.
 */
export function peekReturnTo(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('pxl_return_to')
}

export interface SourceContext {
  source_url?: string
  source_type?: 'listing' | 'building' | 'search'
  listing_id?: string
  building_slug?: string
  min_beds?: string
  min_price?: string
  max_price?: string
  subarea?: string
  property_type?: string
}

/**
 * Parse a stored return-to path into CRM-friendly context fields.
 * Detects listing pages, building pages, and search/filter pages.
 * Returns an empty object when the path carries no useful context.
 */
export function parseSourceContext(returnTo: string | null): SourceContext {
  if (!returnTo) return {}

  // Listing detail — /agent/{slug}/listing/{mlsId} or domain-mode /listing/{mlsId}
  const listingMatch = returnTo.match(/\/listing\/([^/?#]+)/)
  if (listingMatch) {
    return { source_type: 'listing', listing_id: listingMatch[1], source_url: returnTo }
  }

  // Building detail — /agent/{slug}/building/{buildingSlug}
  const buildingMatch = returnTo.match(/\/building\/([^/?#]+)/)
  if (buildingMatch) {
    return { source_type: 'building', building_slug: buildingMatch[1], source_url: returnTo }
  }

  // Search / filter page — any path with a query string
  const qIdx = returnTo.indexOf('?')
  if (qIdx !== -1) {
    const qs = new URLSearchParams(returnTo.slice(qIdx + 1))
    const ctx: SourceContext = { source_type: 'search', source_url: returnTo }
    const beds     = qs.get('beds')
    const minPrice = qs.get('min_price')
    const maxPrice = qs.get('max_price')
    const subarea  = qs.get('subarea')
    const type     = qs.get('type')
    if (beds)     ctx.min_beds      = beds
    if (minPrice) ctx.min_price     = minPrice
    if (maxPrice) ctx.max_price     = maxPrice
    if (subarea)  ctx.subarea       = subarea
    if (type)     ctx.property_type = type
    return ctx
  }

  // Just store the URL so the agent can see what page triggered the sign-up
  return { source_url: returnTo }
}
