import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, getListings, agentCanonicalBase, resolveAgentPrefix } from '@/lib/api'
import ListingStrip from '@/components/ListingStrip'
import W2HomeEvaluation from '@/components/W2HomeEvaluation.client'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) return { title: 'White Rock, BC' }
  const domain = agentCanonicalBase(agent)
  const title = `White Rock, BC — Homes, Waterfront & Community Guide | ${agent.name} REALTOR®`
  const description = `Walk to White Rock Pier, Marine Drive dining, and Semiahmoo Bay. Explore waterfront homes, the Promenade, and White Rock beach real estate with ${agent.name}.`
  const canonical = `https://${domain}/white-rock`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: `https://${domain}/opengraph.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const FAQ_ITEMS = [
  {
    q: 'Is White Rock walkable?',
    a: 'Yes — White Rock\'s town centre and beachfront are highly walkable. Marine Drive, the Pier, and the Promenade are all connected on foot. Most services, restaurants, and the beach are within a 10–15 minute walk from homes in the core.',
  },
  {
    q: 'What is Marine Drive like?',
    a: 'Marine Drive is White Rock\'s main commercial and dining strip running parallel to the beach. It\'s lined with independent restaurants, cafés, boutiques, and seafood spots. On summer evenings the strip is buzzing — parking is tight and the patios are full. It\'s one of the most distinctive main streets in Metro Vancouver.',
  },
  {
    q: 'How close are homes to the beach?',
    a: 'The closest homes are steps from the sand — some properties on Marine Drive have direct beach frontage. Most homes in White Rock\'s central core are a 5–15 minute walk to the water. Homes in the upper hillside areas of White Rock are a short drive or a steep walk, but still offer sweeping ocean views.',
  },
  {
    q: 'What\'s the difference between White Rock and South Surrey?',
    a: 'White Rock is an independent city with its own municipal government, known for the beach, pier, and Marine Drive. South Surrey is the southern part of the City of Surrey — a larger area with master-planned communities like Morgan Creek and Grandview Heights. Many buyers consider both when searching, but White Rock commands a premium for walkability and the waterfront lifestyle.',
  },
  {
    q: 'What schools serve White Rock?',
    a: 'White Rock is served by School District 36 (Surrey). Key schools include White Rock Elementary (K–7), Semiahmoo Secondary (8–12), and several private options nearby. Semiahmoo Secondary is well-regarded for its academics and arts programs.',
  },
  {
    q: 'How far is White Rock from downtown Vancouver?',
    a: 'White Rock is approximately 50 km south of downtown Vancouver — about 40–50 minutes by car via Highway 99 under normal conditions. The South Surrey Park & Ride offers express bus service, and commuters find the drive manageable for a lifestyle trade-off of waterfront living.',
  },
]

export default async function WhiteRockPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, listingsResult] = await Promise.all([
    getAgent(slug),
    getListings(slug, { status: 'Active', subarea: 'White Rock', limit: 8 }),
  ])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const domain = agentCanonicalBase(agent)
  const siteUrl = `https://${domain}`
  const canonicalUrl = `${siteUrl}/white-rock`

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  })

  const placeJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'White Rock, BC',
    url: canonicalUrl,
    description: 'A seaside city south of Vancouver known for the White Rock Pier, Marine Drive dining strip, and the Promenade along Semiahmoo Bay.',
    containedInPlace: { '@type': 'City', name: 'White Rock' },
    subjectOf: [
      {
        '@type': 'LandmarksOrHistoricalBuildings',
        name: 'White Rock Pier',
        description: 'One of the longest piers in Canada at 470 metres, extending into Semiahmoo Bay — a White Rock landmark and gathering point.',
      },
      {
        '@type': 'LandmarksOrHistoricalBuildings',
        name: 'Marine Drive',
        description: 'White Rock\'s beachside commercial strip featuring independent restaurants, boutiques, and ocean views.',
      },
      {
        '@type': 'Place',
        name: 'White Rock Promenade',
        description: 'A paved waterfront walkway running the length of the beach, connecting Marine Drive with the Pier and tidal flats.',
      },
    ],
  })

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Neighbourhoods', item: `${siteUrl}/neighbourhoods` },
      { '@type': 'ListItem', position: 3, name: 'White Rock', item: canonicalUrl },
    ],
  })

  const listings = listingsResult.listings

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: placeJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0a1628', minHeight: 420 }}>
        <img
          src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&h=700&fit=crop&q=80"
          alt="White Rock beach and pier at sunset"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', opacity: 0.45 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,22,40,0.3) 0%, rgba(10,22,40,0.80) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="container" style={{ padding: '56px var(--container-padding) 52px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 12, fontWeight: 500 }}>
              <a href={ap('/neighbourhoods')} style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Neighbourhoods</a>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>›</span>
              White Rock
            </div>

            <h1 className={playfair.className} style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 500, lineHeight: 1.08, color: '#fff', margin: '0 0 16px', maxWidth: 700 }}>
              White Rock, BC — Beach Town Living
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 600, margin: '0 0 28px' }}>
              Walk to the Pier. Dine on Marine Drive. Wake up to Semiahmoo Bay. White Rock is where buyers choose lifestyle over commute — and never look back.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={ap('/homes-for-sale/white-rock')} style={{ background: 'var(--accent, #c9a84c)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                White Rock Homes for Sale →
              </a>
              <a href={ap('/neighbourhood/white-rock')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
                Market Stats & Prices
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick-fact strip ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--primary-bg)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container" style={{ padding: '0 var(--container-padding)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, overflowX: 'auto' }}>
            {[
              { icon: '🌊', label: 'Semiahmoo Bay', sub: 'Pacific coastline' },
              { icon: '🚶', label: 'Walkable core', sub: 'Beach & shops on foot' },
              { icon: '🍽️', label: 'Marine Drive', sub: '40+ restaurants & cafés' },
              { icon: '🚗', label: '~45 min to YVR', sub: 'Via Highway 99' },
              { icon: '🏫', label: 'SD 36 schools', sub: 'Semiahmoo Secondary' },
            ].map(f => (
              <div key={f.label} style={{ padding: '18px 28px', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 140, flexShrink: 0 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr min(320px,100%)', gap: '48px 56px', alignItems: 'start' }} className="wr-grid">

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <div>

            {/* ── Intro ────────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <h2 className={playfair.className} style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                What Makes White Rock Different
              </h2>
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                <p style={{ marginTop: 0 }}>
                  White Rock isn&apos;t a neighbourhood — it&apos;s its own city, and buyers who choose it usually don&apos;t consider anywhere else. The combination of a genuine beachfront, a working Pier, and a walkable commercial strip is rare in Metro Vancouver. Most coastal communities in the region are drive-to; White Rock is walk-out-the-door.
                </p>
                <p>
                  The housing stock reflects that premium. Hillside homes with ocean views command prices that rival Dunbar and Point Grey. Waterfront condos on Marine Drive are among the most sought-after strata properties in South Surrey. Even townhouses a few blocks back from the water hold their value because the lifestyle is the draw — not just the square footage.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Buyers who land in White Rock tend to stay. The community has a strong neighbourhood identity, a lively restaurant scene that runs year-round, and the kind of pace that makes a Sunday morning walk to the Pier feel like the main event.
                </p>
              </div>
            </section>

            {/* ── The Pier & Waterfront ──────────────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <div style={{ borderLeft: '3px solid var(--accent, #c9a84c)', paddingLeft: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: 6 }}>Landmark</div>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                  The Pier &amp; Tidal Flats
                </h2>
              </div>
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                <p style={{ marginTop: 0 }}>
                  The White Rock Pier extends 470 metres into Semiahmoo Bay — one of the longest public piers in Canada. It&apos;s a working pier: crabbers, fishermen, and sunset-watchers all share the planks. At low tide the tidal flats stretch hundreds of metres, and the giant white rock itself is exposed — a glacial erratic that gave the city its name.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Most homes in the White Rock core are a 5–15 minute walk to the pier. For buyers who value that proximity, properties on or near Marine Drive and Johnston Road sell at a meaningful premium. When clients ask us why White Rock prices hold up, the pier view is a large part of the answer.
                </p>
              </div>
            </section>

            {/* ── Marine Drive Dining ───────────────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <div style={{ borderLeft: '3px solid var(--accent, #c9a84c)', paddingLeft: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: 6 }}>Dining & Social</div>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                  Marine Drive
                </h2>
              </div>
              <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85, marginTop: 0, marginBottom: 20 }}>
                Marine Drive runs the length of the beach and is White Rock&apos;s social and culinary spine. On a summer evening every patio is full and the sidewalks are busy. A few spots worth knowing:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {[
                  { name: 'The Boathouse', type: 'Seafood & waterfront dining', note: 'Right on the pier approach — prime sunset tables' },
                  { name: 'Wally\'s Burgers', type: 'Classic burger shack', note: 'A White Rock institution since the 1960s' },
                  { name: 'Giraffe Restaurant', type: 'Pacific Northwest cuisine', note: 'Fine dining with Semiahmoo Bay views' },
                  { name: 'Uli\'s Restaurant', type: 'European bistro', note: 'Local favourite for weekend brunch' },
                  { name: 'Moby Dick Seafood', type: 'Fish & chips', note: 'Counter service, lineup-worthy fish and chips' },
                  { name: 'Peace Arch Brewing', type: 'Craft brewery', note: 'Craft beer with an ocean-view patio' },
                ].map(r => (
                  <div key={r.name} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 3 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent, #c9a84c)', fontWeight: 600, marginBottom: 6 }}>{r.type}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.note}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── The Promenade & Beach Access ──────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <div style={{ borderLeft: '3px solid var(--accent, #c9a84c)', paddingLeft: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: 6 }}>Walking & Recreation</div>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                  The Promenade &amp; Beach Access
                </h2>
              </div>
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                <p style={{ marginTop: 0 }}>
                  The White Rock Promenade is a paved waterfront walkway that runs the full length of the beach — roughly 2.5 km from the foot of Martin Street west to the Pier and beyond toward Semiahmoo. It&apos;s flat, accessible, and connects directly to Marine Drive&apos;s restaurants and shops. Early mornings and summer evenings it&apos;s the beating heart of the community.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Beyond the Promenade, the <strong>Centennial Trail</strong> offers a quieter nature walk through the ravine on the hillside, connecting upper White Rock with the waterfront via a shaded, wooded path. For cyclists and runners, the flat stretch of Marine Drive and the Promenade is the most popular route.
                </p>
              </div>
            </section>

            {/* ── Community character ───────────────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <div style={{ borderLeft: '3px solid var(--accent, #c9a84c)', paddingLeft: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: 6 }}>Community</div>
                <h2 className={playfair.className} style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                  Who Lives Here
                </h2>
              </div>
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85 }}>
                <p style={{ marginTop: 0 }}>
                  White Rock draws a particular kind of buyer: people who have decided that the lifestyle is the point. The community is diverse in age but unified by an appreciation for the coast. Retirees and empty-nesters make up a significant share — this is one of the most popular downsizing destinations in Metro Vancouver. But the neighbourhood has been pulling in younger families too, attracted by the school quality, the walkability, and the sense of place you don&apos;t find in newer subdivisions.
                </p>
                <p style={{ marginBottom: 0 }}>
                  The Semiahmoo Peninsula connection means White Rock shares a border with the US at Blaine, Washington — a handful of buyers appreciate the easy border access. More broadly, the city feels independent in a way that most Metro Vancouver suburbs don&apos;t: there&apos;s a town hall, a local police department, a genuine downtown, and community events that fill the Promenade on summer weekends.
                </p>
              </div>
            </section>

            {/* ── Homes For Sale ───────────────────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: 6 }}>Active MLS®</div>
                  <h2 className={playfair.className} style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--primary-bg)', margin: 0, lineHeight: 1.2 }}>
                    White Rock Homes for Sale
                  </h2>
                </div>
                <a href={ap('/homes-for-sale/white-rock')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent, #c9a84c)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  See all White Rock homes →
                </a>
              </div>
              {listings.length > 0 ? (
                <ListingStrip listings={listings} />
              ) : (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                    Loading White Rock listings — <a href={ap('/homes-for-sale/white-rock')} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>browse all active homes →</a>
                  </p>
                </div>
              )}
            </section>

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <section style={{ marginBottom: 52 }}>
              <h2 className={playfair.className} style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 400, color: 'var(--primary-bg)', margin: '0 0 20px', lineHeight: 1.2 }}>
                Frequently Asked Questions
              </h2>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                {FAQ_ITEMS.map((faq, i) => (
                  <details key={i} style={{ borderBottom: i < FAQ_ITEMS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <summary style={{ padding: '16px 22px', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', background: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span>{faq.q}</span>
                      <span style={{ color: 'var(--accent, #c9a84c)', fontSize: 20, flexShrink: 0, lineHeight: 1 }}>+</span>
                    </summary>
                    <div style={{ padding: '0 22px 18px', background: 'var(--off-white)', fontSize: 14, color: 'var(--text)', lineHeight: 1.85 }}>
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* ── Internal links ────────────────────────────────────────── */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', background: '#fff' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', marginBottom: 14 }}>Explore White Rock</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'White Rock Market Stats', href: ap('/neighbourhood/white-rock') },
                  { label: 'White Rock Sold History', href: ap('/neighbourhood/white-rock?show=sold') },
                  { label: 'White Rock Lifestyle Guide', href: ap('/guide/living-in-white-rock') },
                  { label: 'White Rock Homes', href: ap('/homes-for-sale/white-rock') },
                  { label: 'All Neighbourhoods', href: ap('/neighbourhoods') },
                  { label: 'Condo Buildings', href: ap('/buildings') },
                  { label: 'Free Home Evaluation', href: ap('/home-evaluation') },
                ].map(l => (
                  <a key={l.href} href={l.href}
                    style={{ background: 'var(--off-white)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}>
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

          </div>

          {/* ── Sidebar ───────────────────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: 'calc(var(--nav-height) + 20px)' }}>

            {/* CTA card */}
            <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '28px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent, #c9a84c)', marginBottom: 10 }}>
                Thinking of Buying?
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 10, lineHeight: 1.25 }}>
                White Rock Real Estate with {agent.name.split(' ')[0]}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 1.7, marginBottom: 20 }}>
                Local expertise, honest guidance, and a track record in South Surrey &amp; White Rock.
              </p>
              <a href={ap('/contact')} style={{ display: 'block', background: 'var(--accent, #c9a84c)', color: '#1a1a1a', padding: '12px 0', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center', marginBottom: 10 }}>
                Get in Touch
              </a>
              <a href={ap('/homes-for-sale/white-rock')} style={{ display: 'block', background: 'rgba(255,255,255,0.10)', color: '#fff', padding: '11px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                Browse White Rock Homes
              </a>
            </div>

            {/* Neighbourhood links */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
                Nearby Areas
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Ocean Park', href: '/neighbourhood/ocean-park' },
                  { label: 'Elgin Chantrell', href: '/neighbourhood/elgin-chantrell' },
                  { label: 'Morgan Creek', href: '/neighbourhood/morgan-creek' },
                  { label: 'Grandview Surrey', href: '/neighbourhood/grandview-surrey' },
                  { label: 'South Surrey →All', href: '/neighbourhoods' },
                ].map(l => (
                  <li key={l.label}>
                    <a href={ap(l.href)} style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{l.label}</span>
                      <span style={{ color: 'var(--accent, #c9a84c)', fontSize: 16 }}>›</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Free evaluation */}
            <div style={{ background: 'var(--off-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 18px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-bg)' }}>Free Home Evaluation</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>What&apos;s your White Rock home worth?</div>
              </div>
              <div style={{ padding: '18px' }}>
                <W2HomeEvaluation agent={agent} neighbourhood="White Rock" />
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        details summary::-webkit-details-marker { display: none }
        details[open] summary span:last-child { transform: rotate(45deg); display: inline-block }
        @media (max-width: 860px) {
          .wr-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
