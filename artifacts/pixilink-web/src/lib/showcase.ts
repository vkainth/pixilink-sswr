import { notFound } from 'next/navigation'
import type { AgentProfile } from './types'
import { resolveSiteConfig } from './types'

/**
 * Call immediately after `if (!agent) notFound()` in any route that is
 * removed for showcase agents (e.g. /market, /sold, /buildings).
 * Gating is config-driven via agent.site_config — not a hardcoded slug list.
 */
export function requireNotShowcase(agent: AgentProfile): void {
  if (resolveSiteConfig(agent).layout_preset === 'showcase') {
    notFound()
  }
}

/**
 * Call in routes that are showcase-ONLY (e.g. /featured-properties, /search).
 * Non-showcase agents get a 404 and should use /my-listings or /homes-for-sale.
 */
export function requireShowcase(agent: AgentProfile): void {
  if (resolveSiteConfig(agent).layout_preset !== 'showcase') {
    notFound()
  }
}
