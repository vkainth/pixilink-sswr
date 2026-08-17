'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = ['All Types', 'Condos', 'Townhouses', 'Detached', 'Duplexes'] as const
type Tab = typeof TABS[number]

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString('en-CA', { month: 'long', year: 'numeric' })
}

interface Props {
  activeType: string
  selectedMonth?: string | null
}

export default function ReportFilterBar({ activeType, selectedMonth }: Props) {
  const pathname = usePathname()

  function tabHref(tab: Tab): string {
    const params = new URLSearchParams()
    if (tab !== 'All Types') params.set('type', tab)
    if (selectedMonth) params.set('month', selectedMonth)
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ''}`
  }

  function clearMonthHref(): string {
    const params = new URLSearchParams()
    if (activeType && activeType !== 'All Types') params.set('type', activeType)
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ''}`
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          alignItems: 'center',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab === 'All Types' ? !activeType || activeType === 'All Types' : activeType === tab
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              scroll={false}
              style={{
                padding: '11px 18px',
                display: 'block',
                borderBottom: isActive ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 400,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              {tab}
            </Link>
          )
        })}

        {selectedMonth && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 3, paddingRight: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {formatMonth(selectedMonth)}
            </span>
            <Link
              href={clearMonthHref()}
              scroll={false}
              aria-label="Clear month filter"
              style={{
                background: 'var(--border)',
                borderRadius: '50%',
                width: 18,
                height: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
                lineHeight: 1,
                padding: 0,
                textDecoration: 'none',
              }}
            >
              ×
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
