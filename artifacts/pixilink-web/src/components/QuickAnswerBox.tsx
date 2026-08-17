import type { MarketBadge } from '@/lib/market'

interface QuickAnswerBoxProps {
  lines: string[]
  badge?: MarketBadge | null
}

/**
 * Quick Answer Box — AEO featured-snippet / AI-overview bait.
 * Renders 3 declarative one-liner sentences near the top of market pages.
 * Visually distinct card with a left-accent border.
 */
export default function QuickAnswerBox({ lines, badge }: QuickAnswerBoxProps) {
  if (lines.length === 0) return null
  return (
    <div
      className="quick-answer-box"
      style={{
        background: '#f8faff',
        border: '1px solid #c7d9f8',
        borderLeft: '4px solid var(--primary-bg, #14213d)',
        borderRadius: 10,
        padding: '18px 22px',
        marginBottom: 28,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        Quick Answer
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lines.map((line, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text, #1a1a1a)', lineHeight: 1.6 }}>
            <span style={{ flexShrink: 0, marginTop: 2, width: 16, height: 16, borderRadius: '50%', background: badge && i === 0 ? badge.bg : '#e0eaff', color: badge && i === 0 ? badge.color : 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>
              {i + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
