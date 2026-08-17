export interface AgentAchievement {
  label: string
}

/**
 * Fallback credential lists used when no achievements have been saved in the
 * database yet. The Top REALTOR® page reads from agent.settings.achievements
 * and agent.settings.co_agent_achievements first; these constants are only
 * used when the API returns no data for a given agent/co-agent.
 *
 * To update achievements for live agents, use the admin panel at
 * /admin/agents/{id}/manage/settings — no code change or redeploy needed.
 */
export const AGENT_ACHIEVEMENTS: Record<string, AgentAchievement[]> = {
  tricity: [
    { label: 'MLS Medallion Club — Top 10% of Realtors in Greater Vancouver' },
    { label: 'Top 50 RE/MAX Western Canada' },
    { label: 'Top Coquitlam Realtor 2021–2025 (Rank My Agent & Rate My Agent)' },
    { label: 'Over $60 Million in Transaction Volume in 2025' },
    { label: '95+ Five-Star Google Reviews' },
    { label: 'Local for 22+ years' },
    { label: 'Speaks English + Farsi' },
    { label: 'Certified Negotiation Expert' },
  ],
}

export const CO_AGENT_ACHIEVEMENTS: Record<string, AgentAchievement[]> = {
  'reza hedayat': [
    { label: 'MLS Medallion Club — Top 10% of Realtors in Greater Vancouver' },
    { label: "RE/MAX Chairman's Club" },
    { label: 'Top 100 RE/MAX Agents in Western Canada' },
    { label: 'Best of Coquitlam 2022–2025 (Rank My Agent & Rate My Agent)' },
    { label: 'Best of Port Moody 2022–2025 (Rank My Agent & Rate My Agent)' },
    { label: 'Top Canadian Real Estate Agent (Rank My Agent & Rate My Agent)' },
    { label: 'Certified Negotiation Expert' },
  ],
}

export function getAgentAchievements(slug: string): AgentAchievement[] {
  return AGENT_ACHIEVEMENTS[slug] ?? []
}

export function getCoAgentAchievements(name: string): AgentAchievement[] {
  return CO_AGENT_ACHIEVEMENTS[name.trim().toLowerCase()] ?? []
}
