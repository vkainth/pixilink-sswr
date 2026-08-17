import type { AgentListing } from '@/lib/types'
import { regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'
import { headers } from 'next/headers'
import { formatPriceFull, formatDate } from '@/lib/types'

interface Props {
  rows: AgentListing[]
  isSold?: boolean
  isLoggedIn?: boolean
  slug: string
  /** Normalized filter type (e.g. 'House'); house-only columns show when this is 'House'. */
  type?: string
  /** Current value of the `sort` query param. */
  sort?: string
  /** Builds an href that applies the given sort value (page reset preserved upstream). */
  sortHref?: (sortValue: string) => string
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 2, background: 'var(--off-white)',
}
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '11px 12px', whiteSpace: 'nowrap' }

// Parse the sort param into a base field + direction. Handles legacy single-token values.
function parseSort(sort?: string): { base: string; dir: 'asc' | 'desc' } | null {
  if (!sort) return null
  const m = sort.match(/^(.+)_(asc|desc)$/)
  if (m) return { base: m[1], dir: m[2] as 'asc' | 'desc' }
  if (sort === 'beds') return { base: 'beds', dir: 'desc' }
  if (sort === 'dom') return { base: 'dom', dir: 'asc' }
  return null
}

function formatDropAmount(original: number | string, current: number | string): string {
  const orig = typeof original === 'string' ? parseFloat(String(original).replace(/[^0-9.]/g, '')) : original
  const curr = typeof current === 'string' ? parseFloat(String(current).replace(/[^0-9.]/g, '')) : current
  const drop = orig - curr
  if (!drop || drop <= 0) return '↓ Reduced'
  if (drop >= 1_000_000) return `↓ $${(drop / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return `↓ $${Math.round(drop / 1000)}K`
}

function lotSizeLabel(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'number') return v > 0 ? v.toLocaleString() : '—'
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n.toLocaleString() : String(v)
}

function frontageLabel(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) && n > 0
    ? `${n.toLocaleString('en-CA', { maximumFractionDigits: 1 })} ft`
    : '—'
}

export default async function ListingsTable({ rows, isSold, isLoggedIn, slug, type, sort, sortHref }: Props) {
  if (!rows.length) return null
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`
  const baths = (b: number) => (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1))
  const isHouse = type === 'House'
  const active = parseSort(sort)

  // Sortable header cell: clicking sets sort=<base>_<dir>, toggling direction on repeat.
  function SortTh({ label, base, align = 'left' }: { label: string; base: string; align?: 'left' | 'right' }) {
    const isActive = active?.base === base
    const nextDir = isActive && active?.dir === 'asc' ? 'desc' : 'asc'
    const indicator = isActive ? (active?.dir === 'asc' ? ' ▲' : ' ▼') : ''
    const cellStyle: React.CSSProperties = { ...th, textAlign: align }
    if (!sortHref) {
      return <th style={cellStyle}>{label}</th>
    }
    return (
      <th style={cellStyle}>
        <a
          href={sortHref(`${base}_${nextDir}`)}
          style={{
            color: isActive ? 'var(--text)' : 'inherit',
            textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {label}{indicator}
        </a>
      </th>
    )
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
            <SortTh label="Address" base="address" />
            <SortTh label="Type" base="type" />
            <SortTh label="Beds" base="beds" />
            <SortTh label="Baths" base="baths" />
            <SortTh label="Sqft" base="sqft" />
            {isHouse && <SortTh label="Lot Size" base="lot_size" />}
            {isHouse && <SortTh label="Frontage" base="frontage" />}
            {isHouse && <SortTh label="Levels" base="levels" />}
            <SortTh label={isSold ? 'Sold Price' : 'Price'} base="price" />
            <SortTh label={isSold ? 'Sold Date' : 'DOM'} base={isSold ? 'date' : 'dom'} />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const href = ap(isSold ? `/sold/${r.mls_no}` : `/listing/${r.slug || r.mls_no}`)
            const showBlur = isSold && !isLoggedIn
            const price = isSold && r.sold_price ? r.sold_price : r.list_price
            return (
              <tr key={r.id || r.mls_no} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, whiteSpace: 'normal', maxWidth: 240 }}>
                  <a href={href} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>{r.address}</a>
                  {r.subarea && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.subarea}</div>
                  )}
                </td>
                <td style={td}>{r.type || '—'}</td>
                <td style={td}>{r.beds}</td>
                <td style={td}>{baths(r.baths)}</td>
                <td style={td}>{r.sqft > 0 ? r.sqft.toLocaleString() : '—'}</td>
                {isHouse && <td style={td}>{lotSizeLabel(r.lot_size)}</td>}
                {isHouse && <td style={td}>{frontageLabel(r.frontage)}</td>}
                {isHouse && <td style={td}>{r.levels != null && r.levels > 0 ? r.levels : '—'}</td>}
                <td style={{ ...td, fontWeight: 700 }}>
                  {showBlur ? (
                    <a href={ap('/sign-in')} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>Sign in →</a>
                  ) : (
                    <>
                      {formatPriceFull(price)}
                      {!isSold && r.price_reduced && (
                        <>
                          {r.original_price && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginLeft: 6, textDecoration: 'line-through', textDecorationColor: '#dc2626' }}>
                              {formatPriceFull(r.original_price)}
                            </span>
                          )}
                          {r.original_price && (
                            <span style={{ display: 'inline-block', marginLeft: 6, background: '#dc2626', color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, padding: '2px 6px', borderRadius: 3, verticalAlign: 'middle' }}>
                              {formatDropAmount(r.original_price, r.list_price)}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </td>
                <td style={td}>
                  {isSold
                    ? (r.sold_date ? formatDate(r.sold_date, { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
                    : (r.dom != null ? `${r.dom}d` : '—')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
