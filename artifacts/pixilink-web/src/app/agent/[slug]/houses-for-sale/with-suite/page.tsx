import { getAgent, getAgentTerritories, getListings, agentCanonicalBase, agentAreaDisplay, regionSlugForAgent } from '@/lib/api'
import { ListingsCore } from '../../homes-for-sale/ListingsCore'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories, listings] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug),
    getListings(slug, { status: 'Active', type: 'House', with_suite: true, limit: 1 }),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain    = agentCanonicalBase(agent)
  const location  = agentAreaDisplay(territories)
  const canonical = `https://${domain}/houses-for-sale/with-suite`
  const title     = `${listings.total} Houses with Suite for Sale in ${location} | ${agentName}`
  const description = `Browse detached houses with secondary suites for sale in ${location}. A basement or garden suite can generate $1,500–$2,500/mo in rental income, helping offset your mortgage. Live MLS® listings updated every 5 minutes with ${agentName}.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: agentName },
    twitter:   { card: 'summary_large_image', title, description },
  }
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is a secondary suite in a house?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A secondary suite (also called a basement suite, in-law suite, or mortgage helper) is a self-contained living unit within a detached home — typically in the basement — with its own kitchen, bathroom, and separate entrance. In British Columbia, secondary suites are subject to the BC Building Code and local municipal zoning bylaws. Suites that meet all safety and zoning requirements are called legal suites; those that do not are unauthorized suites. Both types are common in the South Surrey and White Rock market.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much rental income can a basement suite generate in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A basement suite in South Surrey typically rents for $1,400 to $2,200 per month, depending on size, finishings, and the number of bedrooms. A two-bedroom suite in a desirable neighbourhood like Morgan Creek or Grandview Heights can command $1,800 to $2,200. Over a year, that amounts to $21,600 to $26,400 in gross rental income, which can meaningfully reduce the effective carrying cost of your mortgage.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does a suite add to the resale value of a home?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Buyers increasingly value income-producing properties, and a well-finished, legal secondary suite typically adds between $75,000 and $150,000 to a home\'s market value in the South Surrey area. A legal suite is valued more than an unauthorized one because buyers do not need to budget for legalization costs. Suite homes also sell faster on average because the mortgage helper narrative expands the buyer pool to include investors and multi-generational families.',
      },
    },
    {
      '@type': 'Question',
      name: 'What should I look for when buying a house with a suite?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When evaluating a suite home, confirm whether the suite has a separate exterior entrance (not through the main home), a full kitchen, an egress window in the bedroom (required for safety by BC code), hardwired smoke and CO detectors, and a fire separation between the suite and main dwelling. Ask your agent to request proof of any permits or a city inspection. Also verify the suite is permitted under the city\'s zoning — Surrey requires a development permit for secondary suites in most residential zones.',
      },
    },
  ],
}

export default async function HousesWithSuitePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const location = agentAreaDisplay(territories)
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  const agentFirstName = (agent?.name || 'Your Realtor').split(' ')[0]

  const intro = `Browse detached houses with secondary suites for sale in ${location}. A basement or garden suite provides a self-contained rental unit that can generate $1,500–$2,500/month in rental income — helping buyers qualify for larger mortgages and investors build immediate cash flow. ${agentFirstName} specializes in the local detached home market and can help you evaluate suite quality, legality, and rental potential before you buy.`

  const seoFooter = (
    <div>
      <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
          Frequently Asked Questions — Houses with Suite
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {faqSchema.mainEntity.map((faq, i) => (
            <details key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', padding: '14px 0' }}>
              <summary style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {faq.name}
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              </summary>
              <p style={{ margin: '12px 0 0', fontSize: 14, color: '#555', lineHeight: 1.75 }}>{faq.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>
      </section>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Also see:{' '}
        <a href={`${agentPrefix}/houses-for-sale/legal-suite`} style={{ color: 'var(--accent)', marginRight: 12 }}>Legal Suite Homes</a>
        <a href={`${agentPrefix}/houses-for-sale/coach-home`} style={{ color: 'var(--accent)', marginRight: 12 }}>Coach Homes</a>
        <a href={`${agentPrefix}/houses-for-sale/laneway-house`} style={{ color: 'var(--accent)' }}>Laneway Houses</a>
      </div>
    </div>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ListingsCore
        slug={slug}
        sp={sp}
        lockedType="House"
        suiteParams={{ with_suite: '1' }}
        lockedIntro={intro}
        lockedH1={`Houses with Suite for Sale in ${location}`}
        seoFooter={seoFooter}
      />
    </>
  )
}
