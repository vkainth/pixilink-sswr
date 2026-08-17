export interface StatItem {
  label: string
  value: string
  sub?: string
}

interface Props {
  stats: StatItem[]
  accent?: string
  dark?: boolean
  primaryBg?: string
}

export default function StatCards({ stats, accent = '#111111', dark = false, primaryBg = '#111111' }: Props) {
  const bg = dark ? primaryBg : '#fff'
  const cardBg = dark ? '#242424' : '#fff'
  const labelColor = dark ? 'rgba(255,255,255,0.85)' : '#64748b'
  const borderColor = dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'

  return (
    <div style={{ background: bg, padding: dark ? '28px 40px' : '0', display: 'flex', gap: dark ? 0 : 16, flexWrap: 'wrap' }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: '1 1 140px',
          background: cardBg,
          borderLeft: `3px solid ${accent}`,
          padding: '18px 22px',
          borderRadius: dark ? 0 : 8,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: dark ? 'none' : `1px solid ${borderColor}`,
          borderTop: dark ? 'none' : `1px solid ${borderColor}`,
        }}>
          <div style={{ fontSize: 11, color: labelColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: accent, letterSpacing: -0.5 }}>{s.value}</div>
          {s.sub && <div style={{ fontSize: 11, color: labelColor, marginTop: 3 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}
