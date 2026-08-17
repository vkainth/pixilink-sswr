'use client'
import { useState } from 'react'
import type { AgentListing } from '@/lib/types'
import { formatPriceFull, formatDate } from '@/lib/types'

interface Props {
  rows: AgentListing[]
  sold?: boolean
  isLoggedIn?: boolean
  highlightMls?: string
  slug?: string
  agentPrefix?: string
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 10px', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 2, background: 'var(--off-white)',
}
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text)', padding: '7px 10px', whiteSpace: 'nowrap' }
const tdFoot: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--off-white)' }

type BedFilter = 'all' | '1' | '2' | '3' | '3+'
const BED_FILTERS: { label: string; value: BedFilter }[] = [
  { label: 'All', value: 'all' },
  { label: '1 bed', value: '1' },
  { label: '2 bed', value: '2' },
  { label: '3 bed', value: '3' },
  { label: '3+ bed', value: '3+' },
]

function median(nums: number[]): number | null {
  const valid = nums.filter(n => n > 0).sort((a, b) => a - b)
  if (!valid.length) return null
  const mid = Math.floor(valid.length / 2)
  return valid.length % 2 ? valid[mid] : Math.round((valid[mid - 1] + valid[mid]) / 2)
}

function medianFloat(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n != null && n > 0).sort((a, b) => a - b)
  if (!valid.length) return null
  const mid = Math.floor(valid.length / 2)
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2
}

function medianSigned(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n != null && isFinite(n)).sort((a, b) => a - b)
  if (!valid.length) return null
  const mid = Math.floor(valid.length / 2)
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2
}

function applyBedFilter(rows: AgentListing[], filter: BedFilter): AgentListing[] {
  if (filter === 'all') return rows
  if (filter === '3+') return rows.filter(r => r.beds >= 3)
  return rows.filter(r => r.beds === parseInt(filter, 10))
}

function vsAskingPct(listPrice: number, soldPrice: number | null | undefined): number | null {
  if (!soldPrice || listPrice <= 0) return null
  return ((soldPrice - listPrice) / listPrice) * 100
}

function renderVsAsking(pct: number | null): React.ReactNode {
  if (pct === null) return '—'
  const abs = Math.abs(pct).toFixed(1)
  if (pct < 0) return <span style={{ color: '#15803d', fontWeight: 600 }}>{abs}% under</span>
  if (pct > 0) return <span style={{ color: '#b45309', fontWeight: 600 }}>{abs}% over</span>
  return <span style={{ color: 'var(--text-muted)' }}>At asking</span>
}

export default function BuildingComparisonTable({ rows, sold, isLoggedIn, highlightMls, slug, agentPrefix }: Props) {
  const [bedFilter, setBedFilter] = useState<BedFilter>('all')

  if (!rows.length) return null
  const ap = (p: string) => agentPrefix ? `${agentPrefix}${p}` : (slug ? `/agent/${slug}${p}` : p)
  const baths = (b: number) => (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1))

  const filteredRows = applyBedFilter(rows, bedFilter)

  const minPrice = Math.min(...filteredRows.map(r => (sold ? r.sold_price ?? 0 : r.list_price) || 0).filter(p => p > 0))
  const maxPrice = Math.max(...filteredRows.map(r => (sold ? r.sold_price ?? 0 : r.list_price) || 0).filter(p => p > 0))

  const medianPrice = sold
    ? median(filteredRows.map(r => r.sold_price ?? 0))
    : median(filteredRows.map(r => r.list_price))
  const medianSqft = median(filteredRows.map(r => r.sqft))

  const psfValues = filteredRows.map(r => {
    const price = sold ? (r.sold_price ?? 0) : r.list_price
    return price > 0 && r.sqft > 0 ? Math.round(price / r.sqft) : 0
  })
  const medianPsf = median(psfValues)

  const medianDom = medianFloat(filteredRows.map(r => r.dom))
  const medianStrata = medianFloat(filteredRows.map(r => r.strata_fee))
  const medianTax = medianFloat(filteredRows.map(r => r.tax_amount))

  const vsAskingPcts = sold && isLoggedIn
    ? filteredRows.map(r => vsAskingPct(r.list_price, r.sold_price))
    : []
  const medianVsAsking = medianSigned(vsAskingPcts)

  const fmtStrata = (fee: number | null | undefined) =>
    fee != null && fee > 0 ? `$${Math.round(fee).toLocaleString('en-CA')}/mo` : '—'
  const fmtTax = (tax: number | null | undefined) =>
    tax != null && tax > 0 ? `$${Math.round(tax).toLocaleString('en-CA')}/yr` : '—'
  const truncate = (s: string | null | undefined, len = 22) =>
    s ? (s.length > len ? s.slice(0, len) + '…' : s) : '—'

  const filterBarStyle: React.CSSProperties = {
    display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap',
  }
  const filterBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: active ? 700 : 500,
    padding: '4px 12px', borderRadius: 16, cursor: 'pointer', border: '1px solid #d1d5db',
    background: active ? 'var(--accent)' : '#e5e7eb',
    color: active ? '#fff' : '#374151',
    transition: 'background 0.15s',
  })

  return (
    <div>
      {/* Bedroom filter bar */}
      <div style={filterBarStyle}>
        {BED_FILTERS.map(f => (
          <button
            key={f.value}
            style={filterBtn(bedFilter === f.value)}
            onClick={() => setBedFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        {filteredRows.length !== rows.length && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
            {filteredRows.length} of {rows.length} units
          </span>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No homes match this filter.</div>
      ) : (
        <div className="bct-scroll-wrap" style={{ position: 'relative' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520, border: '1px solid var(--border)', borderRadius: 10, background: '#fff', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: sold ? 1020 : 980 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--off-white)' }}>
                <th style={th}>{sold ? 'Date' : 'Listed'}</th>
                <th style={th}>Unit / Address</th>
                <th style={th}>Beds</th>
                <th style={th}>Baths</th>
                {sold ? (
                  <>
                    <th style={th}>vs Asking</th>
                    <th style={th}>Sold Price</th>
                  </>
                ) : (
                  <>
                    <th style={th}>Price</th>
                    <th style={th}>Tier</th>
                  </>
                )}
                <th style={{ ...th, textAlign: 'right' }}>$/sqft</th>
                <th style={th}>Sqft</th>
                <th style={th}>DOM</th>
                <th style={th}>Strata Fee</th>
                <th style={th}>Tax</th>
                <th style={{ ...th, fontSize: 9.5, color: 'var(--text-muted)' }}>Listed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => {
                const basePrice = sold ? r.sold_price : r.list_price
                const psfRaw = (basePrice && basePrice > 0 && r.sqft > 0) ? Math.round(basePrice / r.sqft) : null
                const psf = (sold && !isLoggedIn) ? null : psfRaw
                const isThis = highlightMls && r.mls_no === highlightMls
                const href = ap(sold ? `/sold/${r.mls_no}` : `/listing/${r.slug || r.mls_no}`)
                const isLowest = !sold && r.list_price === minPrice && filteredRows.filter(x => x.list_price === minPrice).length === 1
                const isTopTier = !sold && r.list_price === maxPrice && filteredRows.length > 1 && filteredRows.filter(x => x.list_price === maxPrice).length === 1
                const dateVal = sold ? r.sold_date : r.list_date
                const pct = sold && isLoggedIn ? vsAskingPct(r.list_price, r.sold_price) : null

                return (
                  <tr key={r.id || r.mls_no} style={{ borderBottom: '1px solid var(--border)', background: isThis ? 'rgba(var(--accent-rgb),0.08)' : undefined }}>
                    {/* Date */}
                    <td style={td}>
                      {dateVal ? formatDate(dateVal, { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                    </td>

                    {/* Address */}
                    <td style={{ ...td, whiteSpace: 'normal', minWidth: 230 }}>
                      <a href={href} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{r.address}</a>
                      {isThis && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>THIS UNIT</span>}
                    </td>

                    {/* Beds / Baths */}
                    <td style={td}>{r.beds}</td>
                    <td style={td}>{baths(r.baths)}</td>

                    {/* Price columns */}
                    {sold ? (
                      <>
                        <td style={td}>
                          {!isLoggedIn ? (
                            <a
                              href={ap('/sign-in')}
                              style={{
                                display: 'inline-block',
                                background: '#1d4ed8', color: '#fff',
                                textDecoration: 'none', fontSize: 11, fontWeight: 600,
                                padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
                              }}
                            >
                              Sign in →
                            </a>
                          ) : renderVsAsking(pct)}
                        </td>
                        <td style={{ ...td, fontWeight: 700 }}>
                          {!isLoggedIn && r.sold_price ? (
                            <a
                              href={ap('/sign-in')}
                              style={{
                                display: 'inline-block',
                                background: '#1d4ed8', color: '#fff',
                                textDecoration: 'none', fontSize: 11, fontWeight: 600,
                                padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
                              }}
                            >
                              Sign in →
                            </a>
                          ) : (
                            formatPriceFull(r.sold_price ?? 0)
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...td, fontWeight: 700 }}>
                          {formatPriceFull(r.list_price)}
                        </td>
                        <td style={td}>
                          {isLowest && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>Lowest</span>}
                          {isTopTier && <span style={{ fontSize: 10, background: '#fef9c3', color: '#92400e', padding: '2px 7px', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>Top-Tier</span>}
                        </td>
                      </>
                    )}

                    {/* $/sqft */}
                    <td style={{ ...td, textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                      {psf ? `$${psf.toLocaleString('en-CA')}` : '—'}
                    </td>

                    {/* Sqft */}
                    <td style={td}>{r.sqft > 0 ? r.sqft.toLocaleString() : '—'}</td>

                    {/* DOM */}
                    <td style={td}>{r.dom != null ? `${r.dom}d` : '—'}</td>

                    {/* Strata Fee */}
                    <td style={td}>{fmtStrata(r.strata_fee)}</td>

                    {/* Tax */}
                    <td style={td}>{fmtTax(r.tax_amount)}</td>

                    {/* Listed By */}
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: 11 }}>{truncate(r.listed_by, 20)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td style={tdFoot} colSpan={2}>Median ({filteredRows.length} unit{filteredRows.length !== 1 ? 's' : ''})</td>
                <td style={tdFoot} colSpan={2}></td>
                {sold ? (
                  <>
                    <td style={tdFoot}>
                      {isLoggedIn && medianVsAsking !== null ? renderVsAsking(medianVsAsking) : '—'}
                    </td>
                    <td style={tdFoot}>{isLoggedIn && medianPrice ? formatPriceFull(medianPrice) : '—'}</td>
                  </>
                ) : (
                  <>
                    <td style={tdFoot}>{medianPrice ? formatPriceFull(medianPrice) : '—'}</td>
                    <td style={tdFoot}></td>
                  </>
                )}
                <td style={{ ...tdFoot, textAlign: 'right' }}>{(!sold || isLoggedIn) && medianPsf ? `$${medianPsf.toLocaleString('en-CA')}` : '—'}</td>
                <td style={tdFoot}>{medianSqft ? medianSqft.toLocaleString() : '—'}</td>
                <td style={tdFoot}>{medianDom != null ? `${Math.round(medianDom)}d` : '—'}</td>
                <td style={tdFoot}>{fmtStrata(medianStrata)}</td>
                <td style={tdFoot}>{fmtTax(medianTax)}</td>
                <td style={tdFoot}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        </div>
      )}
      <style>{`
        .bct-scroll-wrap::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 48px;
          border-radius: 0 10px 10px 0;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.92));
          pointer-events: none;
        }
        @media (min-width: 1200px) {
          .bct-scroll-wrap::after { display: none; }
        }
      `}</style>
    </div>
  )
}
