'use client'

import { useRouter } from 'next/navigation'
import type { MonthlyTrendPoint } from '@/lib/types'

interface Props {
  monthlyTrend: MonthlyTrendPoint[]
  selectedMonth: string | null
  archiveHref: string
  /** Clean subarea URL without any /m/... suffix, e.g. /market/coquitlam-west */
  baseHref: string
}

function formatMonthLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(month)
  if (!match) return month
  const d = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  if (isNaN(d.getTime())) return month
  return d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })
}

const pillBase: React.CSSProperties = {
  padding: '5px 13px',
  borderRadius: 20,
  fontSize: 12,
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'inherit',
  fontWeight: 500,
}

const pillActive: React.CSSProperties = {
  ...pillBase,
  border: '1.5px solid var(--primary-bg)',
  background: 'var(--primary-bg)',
  color: '#fff',
  fontWeight: 700,
}

export default function MonthSelectorBar({ monthlyTrend, selectedMonth, archiveHref, baseHref }: Props) {
  const router = useRouter()

  // Sort months most-recent-first, take up to 24
  const months = [...monthlyTrend]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 24)

  if (months.length === 0) return null

  function selectMonth(month: string | null) {
    // "Latest" → clean subarea URL; historical → /m/YYYY-MM path
    const dest = month ? `${baseHref}/m/${month}` : baseHref
    router.push(dest)
  }

  const isLatest = !selectedMonth

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
      }}>
        Browse by month
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <button onClick={() => selectMonth(null)} style={isLatest ? pillActive : pillBase}>
          Latest
        </button>
        {months.map(m => {
          const isActive = selectedMonth === m.month
          return (
            <button
              key={m.month}
              onClick={() => selectMonth(m.month)}
              style={isActive ? pillActive : pillBase}
            >
              {formatMonthLabel(m.month)}
            </button>
          )
        })}
      </div>
      <a
        href={archiveHref}
        style={{
          display: 'inline-block', marginTop: 8,
          fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none',
        }}
      >
        See full monthly archive →
      </a>
    </div>
  )
}
