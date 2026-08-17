import type { PriceMatrix } from '@/lib/types'

interface Props {
  matrix: PriceMatrix
}

function abbreviatePrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

const PROPERTY_TYPES = ['Apartment', 'Townhouse', 'House']
const BED_LABELS: Record<number, string> = {
  0: 'Studio',
  1: '1 Bed',
  2: '2 Bed',
  3: '3 Bed',
  4: '4+ Bed',
}
const BED_ORDER = [0, 1, 2, 3, 4]

function normalizeType(t: string): string {
  const lower = t.toLowerCase()
  if (lower.includes('apartment') || lower.includes('condo')) return 'Apartment'
  if (lower.includes('townhouse') || lower.includes('row') || lower.includes('town')) return 'Townhouse'
  if (lower.includes('house') || lower.includes('detach') || lower.includes('single')) return 'House'
  return t
}

export default function PriceMatrixGrid({ matrix }: Props) {
  if (!matrix.rows.length) return null

  const byTypeAndBed: Record<string, Record<number, { avg_price: number; avg_ppsf: number | null; count: number }>> = {}

  for (const row of matrix.rows) {
    const type = normalizeType(row.type)
    const beds = row.beds === null ? 0 : row.beds >= 4 ? 4 : row.beds
    if (!byTypeAndBed[type]) byTypeAndBed[type] = {}
    byTypeAndBed[type][beds] = { avg_price: row.avg_price, avg_ppsf: row.avg_ppsf, count: row.count }
  }

  const typesPresent = PROPERTY_TYPES.filter(t => !!byTypeAndBed[t])
  if (!typesPresent.length) return null

  const bedsPresent = BED_ORDER.filter(b =>
    typesPresent.some(t => !!byTypeAndBed[t]?.[b])
  )
  if (!bedsPresent.length) return null

  const th: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: 'var(--off-white)',
  }
  const tdBase: React.CSSProperties = {
    padding: '12px 12px',
    textAlign: 'center',
    verticalAlign: 'middle',
  }

  return (
    <section style={{ marginTop: 44 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 6px' }}>
        What Does Each Home Cost?
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px' }}>
        By bedrooms &amp; property type · Last 30 days sold
      </p>

      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 400, border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
          <thead>
            <tr style={{ background: 'var(--off-white)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ ...th, textAlign: 'left', width: 100 }}>Type</th>
              {bedsPresent.map(b => (
                <th key={b} style={th}>{BED_LABELS[b] ?? `${b} Bed`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {typesPresent.map((type, ti) => (
              <tr key={type} style={{ borderBottom: ti < typesPresent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ ...tdBase, textAlign: 'left', fontWeight: 700, fontSize: 13, color: 'var(--text)', paddingLeft: 16, whiteSpace: 'nowrap' }}>
                  {type}
                </td>
                {bedsPresent.map(b => {
                  const cell = byTypeAndBed[type]?.[b]
                  if (!cell || cell.count === 0) {
                    return (
                      <td key={b} style={{ ...tdBase, color: 'var(--text-muted)', fontSize: 12 }}>
                        —
                      </td>
                    )
                  }
                  return (
                    <td key={b} style={tdBase}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-bg)', lineHeight: 1.2 }}>
                        {abbreviatePrice(cell.avg_price)}
                      </div>
                      {cell.avg_ppsf && cell.avg_ppsf > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          ${Math.round(cell.avg_ppsf)}/ft²
                        </div>
                      )}
                      <div style={{
                        display: 'inline-block',
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: 'var(--off-white)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '1px 7px',
                        lineHeight: 1.6,
                      }}>
                        {cell.count} sold
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        Studio = 0 bedrooms. 4+ Bed includes all homes with 4 or more bedrooms.
      </p>
    </section>
  )
}
