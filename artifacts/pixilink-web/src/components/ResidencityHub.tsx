import { getAgent, getMarketStats, getMarketReport, getResidencityOverview } from '@/lib/api'
import { formatPrice } from '@/lib/types'
import ResidencityNav from './ResidencityNav'
import ResidencityZoneCard from './ResidencityZoneCard'
import type { ZoneByTypeRow } from './ResidencityZoneCard'
import type { ZoneMonthly } from './ResidencityBarChart.client'
import ResidencityDashboardOrchestrator from './ResidencityDashboardOrchestrator.client'
import {
  ResidencityTickerWidget,
  ResidencityBarChartWidget,
  ResidencityHeatmapWidget,
  ResidencityEmailSignupWidget,
} from './ResidencityClientWidgets'

const ZONE_CONFIG = [
  {
    id: 'south-surrey',
    label: 'South Surrey / White Rock',
    agentSlug: 'randy',
    href: 'https://southsurreywhiterock.com',
    external: true,
  },
  {
    id: 'burnaby',
    label: 'Burnaby',
    agentSlug: 'saeed-farhani-ppqu',
    href: '/burnaby',
    external: false,
  },
  {
    id: 'tricity',
    label: 'Tri-Cities',
    agentSlug: 'tricity',
    href: '/tricity',
    external: false,
  },
]

const ZONE_COLORS = ['#c9a84c', '#2563eb', '#10b981']

function normalizeByType(byType: unknown): ZoneByTypeRow[] {
  if (!Array.isArray(byType)) return []
  return byType.map(r => ({
    type: String(r.type ?? ''),
    sold_30d: Number(r.sold_30d ?? 0),
    avg_sold_price: Number(r.avg_sold_price ?? 0),
    market_type: String(r.market_type ?? 'balanced'),
  }))
}

function faqPrice(price: number | null | undefined): string {
  return price ? formatPrice(price) : 'N/A'
}

export default async function ResidencityHub() {
  const [
    ssAgent, ssStats, ssReport,
    bAgent,  bStats,  bReport,
    tAgent,  tStats,  tReport,
    overview,
  ] = await Promise.all([
    getAgent('randy').catch(() => null),
    getMarketStats('randy').catch(() => null),
    getMarketReport('randy').catch(() => null),
    getAgent('saeed-farhani-ppqu').catch(() => null),
    getMarketStats('saeed-farhani-ppqu').catch(() => null),
    getMarketReport('saeed-farhani-ppqu').catch(() => null),
    getAgent('tricity').catch(() => null),
    getMarketStats('tricity').catch(() => null),
    getMarketReport('tricity').catch(() => null),
    getResidencityOverview(30).catch(() => null),
  ])

  const zoneData = [
    { config: ZONE_CONFIG[0], agent: ssAgent, stats: ssStats, report: ssReport },
    { config: ZONE_CONFIG[1], agent: bAgent,  stats: bStats,  report: bReport  },
    { config: ZONE_CONFIG[2], agent: tAgent,  stats: tStats,  report: tReport  },
  ]

  const chartZones: ZoneMonthly[] = zoneData.map((z, i) => ({
    label: z.config.label.split(' /')[0],
    trend: z.report?.monthly_trend ?? [],
    color: ZONE_COLORS[i],
  }))

  const burnabyAvg      = bStats?.avg_sold_price
  const ssByType        = normalizeByType(ssReport?.by_type)
  const burnabyByType   = normalizeByType(bReport?.by_type)
  const tricityByType   = normalizeByType(tReport?.by_type)
  const burnabyHousePrc = burnabyByType.find(r => r.type.toLowerCase().includes('house'))?.avg_sold_price
  const burnabyCondoPrc = burnabyByType.find(r => r.type.toLowerCase().includes('apartment') || r.type.toLowerCase().includes('condo'))?.avg_sold_price
  const tricityTownPrc  = tricityByType.find(r => r.type.toLowerCase().includes('town'))?.avg_sold_price
  const ssHousePrice    = ssByType.find(r => r.type.toLowerCase().includes('house') || r.type.toLowerCase().includes('detach'))?.avg_sold_price

  const ovPrice = (n: number) => {
    if (!n) return '…'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    return `$${Math.round(n / 1000)}K`
  }

  const statBar = [
    { value: overview?.sold_count ? overview.sold_count.toLocaleString() : '—', label: 'Metro Sold (30d)' },
    { value: overview?.active_count ? overview.active_count.toLocaleString() : '—', label: 'Active Listings' },
    { value: overview?.avg_sold_price ? ovPrice(overview.avg_sold_price) : '—', label: 'Avg Sold Price' },
    { value: overview?.avg_dom ? `${overview.avg_dom}d` : '—', label: 'Avg Days on Market' },
    { value: overview?.sold_to_list ? `${overview.sold_to_list.toFixed(1)}%` : '—', label: 'Sold-to-List Ratio' },
  ]

  const faqItems = [
    {
      q: 'What is selling the fastest in Metro Vancouver right now?',
      a: `Residencity tracks sold data across the full Fraser Valley and Lower Mainland — including Surrey, Burnaby, Tri-Cities, Vancouver, Richmond, Abbotsford, and more. Use the heatmap and Market Intelligence panels above to see the most active neighbourhoods right now.`,
    },
    {
      q: 'What is the average sold price in Burnaby?',
      a: `The average sold price in Burnaby is ${faqPrice(burnabyAvg)}. Detached houses average ${faqPrice(burnabyHousePrc)}, while condominiums sell for an average of ${faqPrice(burnabyCondoPrc)}.`,
    },
    {
      q: 'How many homes sold in Metro Vancouver in the last 30 days?',
      a: `Across the full metro — Surrey, White Rock, Langley, Delta, Abbotsford, Mission, Burnaby, Coquitlam, Port Coquitlam, Port Moody, New Westminster, Richmond, Vancouver, North Vancouver, West Vancouver, Maple Ridge, and Pitt Meadows — Residencity tracked ${(overview?.sold_count ?? 0).toLocaleString()} sold homes in the last 30 days.`,
    },
    {
      q: "Is it a buyer's or seller's market in Burnaby?",
      a: `Burnaby's current market conditions vary by property type. Check the Inventory Health panel in Market Intelligence above for the latest months-of-supply data by neighbourhood — including Metrotown, Brentwood, and Burnaby North.`,
    },
    {
      q: 'What is the average townhouse price in Tri-Cities?',
      a: `Townhouses in Tri-Cities (Coquitlam, Port Coquitlam, Port Moody) sell for an average of ${faqPrice(tricityTownPrc)}, making Tri-Cities one of Metro Vancouver's most accessible zones for family homes.`,
    },
    {
      q: 'How does South Surrey compare to Burnaby for real estate?',
      a: `South Surrey / White Rock tends to see higher average sold prices for detached homes (${faqPrice(ssHousePrice)} avg), reflecting larger lot sizes and proximity to the US border and amenities. Use the "Compare Areas" tool above to compare any two neighbourhoods side-by-side.`,
    },
  ]

  return (
    <>
      <ResidencityNav />

      <main style={{ paddingTop: 'var(--nav-height)', background: '#0d1729', color: '#fff', minHeight: '100vh' }}>

        {/* Interest Rate Strip */}
        <div className="rc-no-print" style={{
          background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '9px clamp(16px,4vw,48px)', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Bank of Canada rate: 2.75%</span>
            {' · '}Est. monthly payment on $800K mortgage (20% dn, 25yr):{' '}
            <strong style={{ color: 'rgba(255,255,255,0.75)' }}>~$3,880/mo</strong>
          </div>
        </div>

        {/* Hero + Stat Bar */}
        <section style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(16px,4vw,48px) 32px' }}>
            <div style={{ maxWidth: 680, marginBottom: 36 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                Metro Vancouver & Fraser Valley · Full Market Intelligence
              </div>
              <h1 style={{ fontSize: 'clamp(30px,5vw,52px)', fontWeight: 800, lineHeight: 1.12, margin: 0, marginBottom: 18, letterSpacing: '-0.02em' }}>
                See what&rsquo;s selling.<br />
                <span style={{ color: '#c9a84c' }}>Before everyone else.</span>
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Residencity tracks sold real estate across the full Fraser Valley and Lower Mainland — aggregate statistics, live heatmap, and neighbourhood-level market intelligence. The Snap Stats alternative built for listing appointments.
              </p>
            </div>

            {/* Stat Bar */}
            <div style={{
              display: 'flex', gap: 0, flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              {statBar.map((stat, i) => (
                <div key={stat.label} style={{
                  flex: '1 1 140px', padding: 'clamp(14px,2vw,22px) clamp(14px,2vw,20px)',
                  borderRight: i < statBar.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                }}>
                  <div style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 6 }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sold Ticker */}
          <div className="rc-no-print"><ResidencityTickerWidget /></div>
        </section>

        {/* Heatmap */}
        <section id="heatmap" className="rc-no-print" style={{ padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 6 }}>
                Where Things Are Selling
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                True heatmap of sold properties across the full metro. Filter by type, price, bedrooms, or year built. Shareable URL syncs all filters.
              </p>
            </div>
            <ResidencityHeatmapWidget />
          </div>
        </section>

        {/* Area Search + Compare + Market Panels — all share loaded trends data */}
        <section id="area-search" style={{ padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <ResidencityDashboardOrchestrator />
          </div>
        </section>

        {/* Exclusive Zones (compact strip) */}
        <section id="zones" style={{ padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 6 }}>
                Exclusive Zones
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Each zone has a local expert. Dive into listings, market stats, and neighbourhood data.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {zoneData.map(z => (
                <ResidencityZoneCard
                  key={z.config.id}
                  label={z.config.label}
                  href={z.config.href}
                  external={z.config.external}
                  agent={z.agent}
                  stats={z.stats}
                  byType={normalizeByType(z.report?.by_type)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Monthly Trend Chart */}
        <section style={{ padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 6 }}>
                Monthly Sales Trend
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Homes sold per month across all zones over the last 6 months.
              </p>
            </div>
            <ResidencityBarChartWidget zones={chartZones} />
          </div>
        </section>

        {/* Email Signup */}
        <section id="email-signup" className="rc-no-print" style={{ padding: 'clamp(48px,7vw,80px) clamp(16px,4vw,48px)', background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <ResidencityEmailSignupWidget />
          </div>
        </section>

        {/* SEO Zone Descriptions */}
        <section style={{ padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 36 }}>
              Metro Vancouver Market Snapshot
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 36 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 8 }}>South Surrey / White Rock Real Estate</h3>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                  South Surrey and White Rock offer some of Metro Vancouver&rsquo;s most sought-after coastal real estate, with {ssStats?.sold_last_30_days ?? 0} homes sold in the last 30 days. The area is known for its larger detached homes, ocean views, and established neighbourhoods. Connect with{' '}
                  <a href="https://southsurreywhiterock.com" style={{ color: '#c9a84c' }}>Randy Dyck</a>{' '}for personalized guidance.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 8 }}>Burnaby Real Estate Market</h3>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                  Burnaby recorded {bStats?.sold_last_30_days ?? 0} sold homes in the past 30 days with an average sold price of{' '}
                  {burnabyAvg ? formatPrice(burnabyAvg) : 'N/A'}. Located at the geographic heart of Metro Vancouver, Burnaby offers excellent SkyTrain access and a growing condo market near Metrotown and Brentwood.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#c9a84c', marginBottom: 8 }}>Tri-Cities Real Estate Market</h3>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                  The Tri-Cities — Coquitlam, Port Coquitlam, Port Moody, Maple Ridge, and Pitt Meadows — saw {tStats?.sold_last_30_days ?? 0} sales in the last 30 days. Known for family-friendly communities, greenspace, and relative affordability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="rc-no-print" style={{ padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,48px)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 32 }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {faqItems.map((item, i) => (
                <details key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 0' }}>
                  <summary style={{ fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    {item.q}
                    <span style={{ flexShrink: 0, fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>+</span>
                  </summary>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.55)', margin: 0, marginTop: 12 }}>
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: '#08101e', color: 'rgba(255,255,255,0.3)', padding: 'clamp(24px,4vw,36px) clamp(16px,4vw,48px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/residencity-logo.png" alt="Residencity" height={26}
                style={{ height: 26, width: 'auto', opacity: 0.45 }} />
              <span style={{ fontSize: 12 }}>© {new Date().getFullYear()} Residencity</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              Market data is aggregate sold statistics. No individual listing data. Not investment advice.
            </div>
          </div>
        </footer>

      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide interactive / non-reportable sections */
          nav, footer, .rc-no-print { display: none !important; }

          /* Reset page for clean white report */
          body, main {
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main { padding-top: 0 !important; }

          /* Show report sections cleanly */
          section { break-inside: avoid; border: none !important; }
          section + section { margin-top: 12px; }

          /* Readable text on white */
          h1, h2, h3, h4 { color: #14213d !important; }
          p, li { color: #333 !important; }
          a { color: #14213d !important; text-decoration: none; }

          /* Stat bar: invert for print */
          [style*="rgba(255,255,255,0.04)"] {
            background: #f5f5f5 !important;
            border: 1px solid #ddd !important;
          }

          /* Print-only report header */
          .rc-print-header { display: block !important; }

          /* Page setup */
          @page {
            margin: 18mm 15mm;
            size: A4 portrait;
          }
        }

        /* Screen: hide print-only elements */
        @media screen {
          .rc-print-header { display: none; }
        }
      `}</style>

      {/* Print-only report header */}
      <div className="rc-print-header" style={{
        borderBottom: '2px solid #14213d', paddingBottom: 10, marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#14213d' }}>Residencity</div>
          <div style={{ fontSize: 12, color: '#555' }}>Metro Vancouver Market Intelligence — residencity.ca</div>
        </div>
        <div style={{ fontSize: 11, color: '#888', textAlign: 'right' }}>
          Printed {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
          Aggregate sold statistics. Not investment advice.
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
    </>
  )
}
