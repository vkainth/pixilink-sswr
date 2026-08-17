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
    getListings(slug, { status: 'Active', type: 'House', with_suite: true, legal_suite: true, limit: 1 }),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain    = agentCanonicalBase(agent)
  const location  = agentAreaDisplay(territories)
  const canonical = `https://${domain}/houses-for-sale/legal-suite`
  const title     = `${listings.total} Houses with Legal Suite for Sale in ${location} | ${agentName}`
  const description = `Find detached houses with a legal secondary suite in ${location}. Legal suites meet BC Building Code safety requirements — giving you rental income confidence and a simpler mortgage application. Live MLS® data updated every 5 minutes.`
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
      name: 'What is a legal suite in BC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A legal secondary suite in British Columbia is a self-contained dwelling unit within a single-family home that has received the required permits and inspections from the local municipality. To be legal in the City of Surrey, a secondary suite must comply with the BC Building Code (including fire separation, egress windows, hardwired smoke detectors, and carbon monoxide alarms), be permitted under the property\'s zoning, and have been issued a development permit and building permit. A legal suite gives landlords the right to rent without risk of a bylaw order to vacate, and gives buyers confidence in the rental income stream.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between a legal suite and an unauthorized suite?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'An unauthorized (or "illegal") suite has not been permitted by the municipality, though it may still have been built to code. Unauthorized suites carry risk: the city can order the tenant to vacate, which eliminates your rental income, and insurance companies may not cover damages in an unpermitted suite. Legal suites, by contrast, are fully permitted, insurable, and can be advertised for rent openly. When buying, always ask whether the suite has permits on file — your agent can request a Title Search and City Permit Records to confirm.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does a legal suite make it easier to get a mortgage?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Canadian mortgage lenders allow borrowers to include a portion of a legal suite\'s rental income when calculating qualifying income — typically 50% to 100% of the market rent, depending on the lender and product. This "rental offset" can increase your maximum purchase price by $100,000 to $250,000 depending on your income. Unauthorized suites are generally not recognized for this calculation, making legal suite status a meaningful financial distinction. Speak with a mortgage broker familiar with investment property and suite financing before making an offer.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I verify if a suite is legal before buying?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Request a permit history search from the City of Surrey (or the relevant municipality) before your subject removal date. Your agent can also review the listing for mentions of "city-approved", "permitted", or "legal suite" in the remarks, and request that the seller provide the development and building permit numbers. During the home inspection, a qualified inspector can flag code issues that suggest the suite was never permitted. Never rely solely on the listing description — always verify with the city.',
      },
    },
  ],
}

export default async function LegalSuitePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const location = agentAreaDisplay(territories)
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  const agentFirstName = (agent?.name || 'Your Realtor').split(' ')[0]

  const intro = `Find detached houses with a legal secondary suite in ${location}. Unlike unauthorized suites, a legal suite has been issued municipal permits and inspected to BC Building Code standards — giving you the legal right to rent, insurance coverage, and the ability to use rental income toward your mortgage qualification. ${agentFirstName} can help you verify suite legality and evaluate rental income potential before you remove subjects.`

  const seoFooter = (
    <div>
      <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
          Frequently Asked Questions — Legal Suite Homes
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
        <a href={`${agentPrefix}/houses-for-sale/with-suite`} style={{ color: 'var(--accent)', marginRight: 12 }}>All Suite Homes</a>
        <a href={`${agentPrefix}/houses-for-sale/mortgage-helper`} style={{ color: 'var(--accent)', marginRight: 12 }}>Mortgage Helper Homes</a>
        <a href={`${agentPrefix}/houses-for-sale/coach-home`} style={{ color: 'var(--accent)' }}>Coach Homes</a>
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
        suiteParams={{ with_suite: '1', legal_suite: '1' }}
        lockedIntro={intro}
        lockedH1={`Houses with Legal Suite for Sale in ${location}`}
        seoFooter={seoFooter}
      />
    </>
  )
}
