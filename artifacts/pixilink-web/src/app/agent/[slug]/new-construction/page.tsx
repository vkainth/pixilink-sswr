import { playfair } from '@/lib/fonts'
import {
  getAgent,
  getListings,
  getAgentTerritories,
  getNewConstructionAreas,
  agentCanonicalBase,
  agentAreaDisplay,
  resolveAgentPrefix,
} from '@/lib/api'
import { headers } from 'next/headers'
import { formatPrice, imgUrl, getCoAgents } from '@/lib/types'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { NewConstructionArea } from '@/lib/types'
import { toSubareaSlug } from '../homes-for-sale/subareaUtils'
import ListingStrip from '@/components/ListingStrip'

/*
 * NEW CONSTRUCTION — driven entirely by the agent's own territories.
 *
 * This page used to be 1,216 lines of hand-written regional content: three branches
 * (Burnaby / Tri-Cities / South Surrey), 18 hard-coded neighbourhood cards, six stock
 * photos and dozens of typed-in price ranges, gated to three agent slugs so everyone
 * else got a 404. Two things were wrong with that beyond the duplication:
 *
 *   1. The numbers were fiction that had drifted from the MLS. Grandview Heights was
 *      advertised as "$699K – $1.8M"; the actual active new builds there run
 *      $780K – $2,199K. Nobody would ever have noticed, because nothing recomputed it.
 *   2. It could not answer the question it exists to answer for any other agent.
 *
 * Everything regional now comes from /api-internal/agent/{slug}/new-construction-areas,
 * which aggregates real active new-build listings per subarea within the agent's OWN
 * territories. The only prose left is BC-wide and genuinely static: GST, the 2-5-10
 * warranty, the 7-day presale rescission period. Those are provincial law, not local
 * colour, so they are the same for every agent by definition.
 */

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * What counts as a "new build" for this page. During January and February the current
 * year has almost no completions on the market yet, so the window widens back a year
 * rather than showing an empty page for two months.
 */
function newBuildMinYear(): number {
  const now = new Date()
  return now.getMonth() + 1 <= 2 ? now.getFullYear() - 1 : now.getFullYear()
}

/** "$780K – $2.2M", or null when the area has no priced listings. */
function priceRangeLabel(area: NewConstructionArea): string | null {
  if (!area.min_price || !area.max_price) return null
  if (area.min_price === area.max_price) return formatPrice(area.min_price)
  return `${formatPrice(area.min_price)} – ${formatPrice(area.max_price)}`
}

/** "Condos · Townhouses · Houses" from the MLS type strings actually present. */
function typesLabel(types: string[]): string {
  const PRETTY: Record<string, string> = {
    'Apartment': 'Condos',
    'Apartment Unit': 'Condos',
    'Townhouse': 'Townhouses',
    'House': 'Houses',
    'House/Single Family': 'Houses',
    'Duplex': 'Duplexes',
    'Fourplex': 'Fourplexes',
    'Manufactured': 'Manufactured',
    'Other': 'Other',
    'Recreational': 'Recreational',
  }
  const seen: string[] = []
  for (const t of types) {
    const label = PRETTY[t] ?? t
    if (!seen.includes(label)) seen.push(label)
  }
  return seen.slice(0, 4).join(' · ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  if (!agent) return { title: 'New Construction' }

  const coAgents = getCoAgents(agent)
  const agentName = coAgents.length > 0
    ? `${agent.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}`
    : agent.name
  const areaLabel = agentAreaDisplay(territories)
  const minYear = newBuildMinYear()
  const domain = agentCanonicalBase(agent)
  const canonical = `https://${domain}/new-construction`

  const title = `New Construction Homes in ${areaLabel} | New Builds & Presales | ${agentName}`
  const description = `Browse new construction homes in ${areaLabel} built ${minYear} or later — real MLS® listings with current prices, by neighbourhood. Presale and assignment guidance from ${agentName}.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function NewConstructionPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const agent = await getAgent(slug)
  if (!agent) notFound()
  requireNotShowcase(agent)

  const minYear = newBuildMinYear()
  const [territories, areaData, listingResult] = await Promise.all([
    getAgentTerritories(slug),
    getNewConstructionAreas(slug, minYear),
    getListings(slug, { status: 'Active', min_year: minYear, sort: 'newest', limit: 9 }),
  ])

  // No territories means no defined market, so there is nothing this page can say.
  // Note it does NOT 404 merely because there are no new builds right now — the areas
  // are still the agent's areas, and an honest empty state beats a dead link in the nav.
  if (territories.length === 0) notFound()

  const areaLabel = agentAreaDisplay(territories)
  const firstName = agent.name.split(' ')[0]
  const areas = areaData.areas
  const totalNewBuilds = areaData.total
  const listings = listingResult.listings
  const domain = agentCanonicalBase(agent)

  // Overall price band across the agent's areas — the widest true statement available.
  const priced = areas.filter(a => a.min_price && a.max_price)
  const overallMin = priced.length ? Math.min(...priced.map(a => a.min_price as number)) : null
  const overallMax = priced.length ? Math.max(...priced.map(a => a.max_price as number)) : null
  const overallRange = overallMin && overallMax
    ? `${formatPrice(overallMin)} – ${formatPrice(overallMax)}`
    : null

  // A real photo from a real new build in the agent's own market, rather than a stock
  // photo of a house in another country.
  const heroPhoto = listings.find(l => l.photo_url)?.photo_url ?? null
  const heroSrc = heroPhoto ? imgUrl(heroPhoto, 1600) : null

  const topAreas = areas.slice(0, 3)

  // FAQ built from the same figures rendered on the page, so the rich result and the
  // page can never disagree. Answers omit a number rather than guess when it is absent.
  const faqs: { q: string; a: string }[] = [
    ...(totalNewBuilds > 0 ? [{
      q: `How many new construction homes are for sale in ${areaLabel}?`,
      a: `There are currently ${totalNewBuilds} active MLS® listings built ${minYear} or later across ${areas.length} ${areas.length === 1 ? 'neighbourhood' : 'neighbourhoods'} in ${areaLabel}. That count updates automatically as listings come and go.`,
    }] : []),
    ...(topAreas.length > 0 ? [{
      q: `Which ${areaLabel} neighbourhoods have the most new construction?`,
      a: `Right now: ${topAreas.map(a => `${a.subarea} (${a.new_build_count} new ${a.new_build_count === 1 ? 'home' : 'homes'})`).join(', ')}. ${firstName} can tell you which of these fits what you are looking for.`,
    }] : []),
    ...(overallRange ? [{
      q: `What do new homes cost in ${areaLabel}?`,
      a: `Active new construction in ${areaLabel} currently ranges from ${overallRange}, depending on the neighbourhood and whether you are looking at a condo, townhouse or detached home. The per-neighbourhood ranges above come straight from today's MLS® listings.`,
    }] : []),
    {
      q: 'Do I pay GST on a new construction home in BC?',
      a: 'Yes — 5% GST applies to newly built homes in British Columbia, unlike a resale home. Partial GST rebates exist for lower-priced new homes and for some rental purchases. Because the rebate thresholds and the treatment of assignments change from time to time, confirm the current numbers with your accountant or a real estate lawyer before you write an offer.',
    },
    {
      q: 'What warranty comes with a new build in BC?',
      a: 'New homes in British Columbia must carry third-party home warranty insurance, commonly called 2-5-10: two years on labour and materials, five years on the building envelope, and ten years on the structure. The coverage follows the home, so it carries over to you if you buy from the first owner within those windows.',
    },
    {
      q: 'What is the difference between a presale and a completed new build?',
      a: `A presale is bought from the developer before it is finished — deposits are staged, completion can be years out, and BC gives you a seven-day rescission period after you receive the disclosure statement. A completed new build is on MLS® today and you can walk through it before you buy. Both are covered above: the listings on this page are completed or near-completion homes on MLS®, and ${firstName} can bring presale and assignment opportunities that never reach MLS® at all.`,
    },
  ]

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: 'New Construction', item: `https://${domain}/new-construction` },
    ],
  }

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
    padding: '22px 24px', display: 'flex', flexDirection: 'column',
  }
  const eyebrow: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
    textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8,
  }
  const h2: React.CSSProperties = {
    fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400,
    color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2,
  }

  return (
    <div style={{ background: 'var(--off-white)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', background: 'var(--primary-bg)', overflow: 'hidden' }}>
        {heroSrc && (
          <img
            src={heroSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.35,
            }}
          />
        )}
        <div className="container" style={{ position: 'relative', padding: 'clamp(56px,8vw,88px) var(--container-padding)' }}>
          <div style={{ ...eyebrow, color: 'var(--accent-on-dark)' }}>New Construction</div>
          <h1 className={playfair.className} style={{
            fontSize: 'clamp(30px,4.4vw,50px)', fontWeight: 400, color: '#fff',
            margin: '0 0 16px', lineHeight: 1.12, maxWidth: 760,
          }}>
            New Homes &amp; New Construction in {areaLabel}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 17, lineHeight: 1.7, maxWidth: 620, margin: '0 0 28px' }}>
            {totalNewBuilds > 0
              ? `${totalNewBuilds} active MLS® ${totalNewBuilds === 1 ? 'listing' : 'listings'} built ${minYear} or later across ${areas.length} ${areas.length === 1 ? 'neighbourhood' : 'neighbourhoods'}${overallRange ? `, from ${overallRange}` : ''}.`
              : `Presales, assignments and brand-new completions across ${areaLabel}.`}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={ap('/contact')} style={{
              background: '#fff', color: 'var(--primary-bg)', padding: '13px 26px',
              borderRadius: 7, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}>
              Ask {firstName} about new builds
            </a>
            <a href={ap('/homes-for-sale')} style={{
              border: '1px solid rgba(255,255,255,0.45)', color: '#fff', padding: '13px 26px',
              borderRadius: 7, fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}>
              Browse all listings
            </a>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: 'clamp(40px,6vw,64px) var(--container-padding)' }}>

        {/* ── By neighbourhood — real counts, prices and types per area ───────── */}
        {areas.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <div style={eyebrow}>Where the new builds are</div>
            <h2 className={playfair.className} style={h2}>New Construction by Neighbourhood</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px', maxWidth: 680 }}>
              Every figure below is counted from today&apos;s active MLS® listings built {minYear} or later
              in {areaLabel} — not a hand-maintained list.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {areas.map(area => {
                const range = priceRangeLabel(area)
                const types = typesLabel(area.types)
                // Two link shapes, because only one of them works per area.
                //
                // /homes-for-sale/{slug}/built-{year} is the canonical page and its count
                // matches this card exactly ("29 New Homes (Built 2026+) for Sale in Grandview
                // Surrey") — but it only resolves for subareas present in SUBAREA_MAP. These
                // areas come from live MLS data, and Bolivar Heights, Sullivan Station and
                // Cloverdale BC are all real areas of Randy's that the map does not contain.
                // For those, toSubareaSlug() returns the label unchanged, which produced hrefs
                // with literal spaces that 404'd.
                //
                // So: canonical path when the label is mapped, else the ?subarea= query form,
                // which filters on the raw MLS label and works for anything. Do NOT use the
                // query form for mapped areas — it 301s to the path and then loops into a 500
                // once min_year is duplicated.
                const mappedSlug = toSubareaSlug(area.subarea)
                const isMapped = mappedSlug !== area.subarea
                const areaHref = isMapped
                  ? ap(`/homes-for-sale/${mappedSlug}/built-${minYear}`)
                  : ap(`/homes-for-sale?subarea=${encodeURIComponent(area.subarea)}&min_year=${minYear}`)
                return (
                  <div key={area.subarea} style={card}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 6 }}>
                      {area.new_build_count} new {area.new_build_count === 1 ? 'home' : 'homes'}
                    </div>
                    <div className={playfair.className} style={{ fontSize: 20, fontWeight: 500, color: 'var(--primary-bg)', marginBottom: 10, lineHeight: 1.2 }}>
                      {area.subarea}
                    </div>
                    <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px', flex: 1 }}>
                      {types
                        ? `${types} built ${minYear} or later, currently on MLS® in ${area.city}.`
                        : `New construction currently on MLS® in ${area.city}.`}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div style={{ minWidth: 0 }}>
                        {range && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)' }}>{range}</div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{area.city}</div>
                      </div>
                      <a href={areaHref} style={{
                        background: 'var(--primary-bg)', color: '#fff', padding: '9px 16px',
                        borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                      }}>
                        New builds →
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Live MLS strip ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 52 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={eyebrow}>Active MLS®</div>
              <h2 className={playfair.className} style={{ ...h2, margin: 0 }}>
                {totalNewBuilds > 0
                  ? `${totalNewBuilds} New Home${totalNewBuilds === 1 ? '' : 's'} for Sale`
                  : 'New Homes for Sale'}
              </h2>
            </div>
            <a href={ap('/homes-for-sale')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              See all new builds →
            </a>
          </div>
          {listings.length > 0 ? (
            <ListingStrip listings={listings} />
          ) : (
            <div style={{ ...card, textAlign: 'center', alignItems: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                No completed new builds from {minYear} are on MLS® in {areaLabel} at this moment — inventory
                here turns over quickly. {firstName} tracks presales and assignments that never reach MLS®, so{' '}
                <a href={ap('/contact')} style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>ask directly</a>{' '}
                or <a href={ap('/homes-for-sale')} style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>browse every listing</a>.
              </p>
            </div>
          )}
        </section>

        {/* ── Buyer's guide. BC-wide by nature: this is provincial law and standard
             practice, which is why it is the one part of the page that is not
             derived from the agent's own market. ─────────────────────────────── */}
        <section style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: 'clamp(26px,4vw,40px)', marginBottom: 52, color: '#fff' }}>
          <div style={{ ...eyebrow, color: 'var(--accent-on-dark)' }}>Buyer&apos;s guide</div>
          <h2 className={playfair.className} style={{ ...h2, color: '#fff' }}>
            What to know before buying new
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28 }}>
            {[
              {
                t: 'GST applies',
                d: 'New homes carry 5% GST, which a resale home does not. Rebates exist at lower price points and for some rental purchases — worth confirming the current thresholds with your accountant before you write.',
              },
              {
                t: '2-5-10 warranty',
                d: 'BC requires third-party warranty insurance on new homes: two years on labour and materials, five on the building envelope, ten on the structure. It follows the home, not the buyer.',
              },
              {
                t: 'Presale deposits are staged',
                d: 'Developers take deposits in instalments against construction milestones rather than all at once, and completion can be years after you sign.',
              },
              {
                t: 'Seven days to reconsider',
                d: 'A presale in BC comes with a seven-day rescission period once you receive the disclosure statement. Use it — that is the window for your lawyer to read the contract properly.',
              },
              {
                t: 'Assignments have rules',
                d: 'Whether you can sell your contract before completion depends on the developer’s assignment clause, and there are tax-reporting requirements attached. Never assume it is permitted.',
              },
              {
                t: 'Finishing allowances vary',
                d: 'What a display home shows is often an upgrade package, not the standard spec. Ask what the base finishing actually includes before comparing two builders on price.',
              },
            ].map(item => (
              <div key={item.t}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--accent-on-dark)' }}>{item.t}</div>
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 52 }}>
          <div style={eyebrow}>Questions</div>
          <h2 className={playfair.className} style={h2}>Frequently Asked Questions</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {faqs.map(f => (
              <div key={f.q} style={card}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary-bg)', marginBottom: 8 }}>{f.q}</div>
                <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Keep exploring ─────────────────────────────────────────────────── */}
        <section style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 14 }}>Keep exploring</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { l: 'All Homes for Sale', h: ap('/homes-for-sale') },
              { l: 'Condos for Sale', h: ap('/condos-for-sale') },
              { l: 'Townhouses for Sale', h: ap('/townhouses-for-sale') },
              { l: 'Neighbourhoods', h: ap('/neighbourhoods') },
              { l: `Contact ${firstName}`, h: ap('/contact') },
            ].map(x => (
              <a key={x.l} href={x.h} style={{
                background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13,
              }}>
                {x.l}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
