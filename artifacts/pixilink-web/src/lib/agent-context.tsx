'use client'

import { createContext, useContext } from 'react'

/**
 * Stores the URL prefix for this agent's routes. Three possible values:
 *   ''               — domain mode (e.g. southsurreywhiterock.com → root-relative links work via middleware rewrite)
 *   '/agent/randy'   — path mode   (dev/staging: /agent/:slug prefix)
 *   '/south-surrey'  — region mode (residencity.ca/:region-slug prefix)
 */
export const AgentSlugContext = createContext<string>('')

/**
 * Returns the full URL prefix for this agent's routes.
 * Use this (or useAgentPath) to build all internal navigation links.
 */
export function useAgentPrefix(): string {
  return useContext(AgentSlugContext)
}

/**
 * @deprecated Use useAgentPrefix() or useAgentPath() for link building.
 * Returns the internal agent slug only in /agent/:slug path mode.
 * Returns '' in domain mode and region mode (the prefix handles routing there).
 * Kept for any code that needs the raw slug for non-URL purposes.
 */
export function useAgentSlug(): string {
  const prefix = useContext(AgentSlugContext)
  const match = prefix.match(/^\/agent\/(.+)$/)
  return match ? match[1] : ''
}

/**
 * Returns the full URL for an agent-scoped route.
 * Works in all three routing modes: domain (''), path (/agent/:slug), and region (/:region-slug).
 *
 * @example
 *   useAgentPath('/homes-for-sale')
 *   // domain mode  → '/homes-for-sale'
 *   // path mode    → '/agent/randy/homes-for-sale'
 *   // region mode  → '/south-surrey/homes-for-sale'
 */
export function useAgentPath(path: string): string {
  const prefix = useContext(AgentSlugContext)
  return prefix + path
}
