import type { AgentProfile } from '@/lib/types'

interface Props {
  agent: AgentProfile
  soldCount?: number | null
  avgDom?: number | null
}

export default function AchievementsBar({ agent, soldCount, avgDom }: Props) {
  const hs = agent.settings?.hero_stats
  const achievements = agent.settings?.achievements

  const stats: { v: string; l: string }[] = []

  if (hs?.stat1_value && hs?.stat1_label) stats.push({ v: hs.stat1_value, l: hs.stat1_label })
  if (hs?.stat2_value && hs?.stat2_label) stats.push({ v: hs.stat2_value, l: hs.stat2_label })
  if (hs?.stat3_value && hs?.stat3_label) stats.push({ v: hs.stat3_value, l: hs.stat3_label })
  if (hs?.stat4_value && hs?.stat4_label) stats.push({ v: hs.stat4_value, l: hs.stat4_label })

  if (stats.length === 0) {
    if (soldCount) stats.push({ v: soldCount.toLocaleString(), l: 'Homes Sold' })
    if (avgDom != null) stats.push({ v: `${avgDom}`, l: 'Avg Days on Market' })
    if (achievements?.length) {
      achievements.slice(0, 3).forEach(a => stats.push({ v: '✓', l: a.label }))
    }
  }

  if (stats.length === 0) return null

  return (
    <section style={{ background: 'var(--primary-bg)', padding: '32px 0' }}>
      <div className="container">
        <div className="achievements-grid" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
          gap: 1,
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          {stats.slice(0, 4).map((s, i) => (
            <div key={i} style={{
              padding: '22px 24px',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              textAlign: 'center',
              borderRight: i < Math.min(stats.length, 4) - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none',
            }}>
              <div style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1, marginBottom: 6 }}>
                {s.v}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .achievements-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </section>
  )
}
