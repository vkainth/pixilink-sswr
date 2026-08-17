import type { AgentProfile } from '@/lib/types'
import { getHeroCredentials } from '@/lib/types'
import AgentValuePropCtaClient from './AgentValuePropCta.client'

interface Props {
  agent: AgentProfile
  /** Visual variant: 'card' for a boxed section (default), 'inline' for a slimmer banner. */
  variant?: 'card' | 'inline'
}

/**
 * Site-wide agent value-prop / call-to-action block.
 * Sourced entirely from structured DB fields (agent.phone, agent.settings.hero_stats
 * years_experience / value_prop_blurb / highlights) — never invented copy. Renders
 * nothing if the agent has no phone AND no blurb AND no years/awards (avoids an
 * empty box for agents with no data yet).
 */
export default function AgentValuePropCta({ agent, variant = 'card' }: Props) {
  const yearsExperience = agent.settings?.hero_stats?.years_experience?.trim() || null
  const blurb = agent.settings?.hero_stats?.value_prop_blurb?.trim() || null
  const awards = getHeroCredentials(agent).slice(0, 3)
  const phone = agent.phone?.trim() || null

  if (!yearsExperience && !blurb && awards.length === 0 && !phone) return null

  return (
    <AgentValuePropCtaClient
      agentName={agent.name}
      brokerage={agent.brokerage}
      phone={phone}
      yearsExperience={yearsExperience}
      blurb={blurb}
      awards={awards}
      variant={variant}
    />
  )
}
