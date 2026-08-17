export interface StatItem {
  label: string
  value: string
  sub?: string
}

interface Props {
  items: StatItem[]
  columns?: number
}

export default function StatGrid({ items, columns }: Props) {
  if (!items.length) return null
  const cols = columns ?? Math.min(items.length, 4)
  return (
    <div
      className="stat-grid"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}
    >
      {items.map(s => (
        <div
          key={s.label}
          style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1.1 }}>{s.value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            {s.label}
          </div>
          {s.sub && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>{s.sub}</div>}
        </div>
      ))}
      <style>{`@media (max-width: 760px){.stat-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
    </div>
  )
}
