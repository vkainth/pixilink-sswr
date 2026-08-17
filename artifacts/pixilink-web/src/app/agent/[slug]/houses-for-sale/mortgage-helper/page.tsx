import { getAgent, getAgentTerritories, agentCanonicalBase, agentAreaDisplay, regionSlugForAgent } from '@/lib/api'
import { ListingsCore } from '../../homes-for-sale/ListingsCore'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain    = agentCanonicalBase(agent)
  const location  = agentAreaDisplay(territories)
  const canonical = `https://${domain}/houses-for-sale/mortgage-helper`
  const title     = `Mortgage Helper Homes for Sale in ${location} | ${agentName}`
  const description = `Browse mortgage helper homes for sale in ${location}. A secondary suite generating $1,500–$2,500/mo can reduce your effective mortgage payment by hundreds per month. Live MLS® listings with ${agentName}.`
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
      name: 'What is a mortgage helper home?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A mortgage helper home is a property that includes a secondary suite — typically a basement or garden suite — whose rental income helps the owner cover mortgage payments. In British Columbia, particularly in high-cost markets like South Surrey and White Rock, mortgage helper homes are popular with first-time buyers, families, and investors because the rental income partially or fully offsets the monthly carrying costs. The term "mortgage helper" is informal; the suite itself may be legal (permitted) or unauthorized.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much can a mortgage helper suite save you each month?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A basement suite in South Surrey typically rents for $1,400 to $2,200 per month. On a $1.6 million home with a $1.2 million mortgage at current rates, the monthly mortgage payment is approximately $6,000 to $7,000. A suite generating $1,800/month reduces your effective carrying cost to $4,200 to $5,200 — a savings of 25–30%. Over 25 years, that amounts to over $500,000 in tenant contributions toward your mortgage paydown.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can rental income from a suite help me qualify for a larger mortgage?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, but only with a legal (permitted) suite. Most Canadian lenders accept 50% to 100% of verifiable rental income from a legal secondary suite when calculating your total household income for mortgage qualification purposes. This rental offset can increase your maximum purchase price by $100,000 to $250,000 depending on your lender and income profile. Unauthorized suites are typically not recognized. Speak with a mortgage broker before shopping to understand your qualification ceiling.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are there any risks to buying a home with a mortgage helper suite?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The main risks are vacancy, unauthorized suite status, and landlord responsibilities under BC\'s Residential Tenancy Act. If the suite is unauthorized, you could face a bylaw order to vacate the tenant, losing your rental income. Landlord obligations are substantial — tenants have strong rights in BC, including protections against eviction and rent increase caps. Before purchasing, verify the suite is permitted, budget for a vacancy period, and consult a property manager or legal professional if you are new to being a landlord.',
      },
    },
  ],
}

export default async function MortgageHelperPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const location = agentAreaDisplay(territories)
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  const agentFirstName = (agent?.name || 'Your Realtor').split(' ')[0]

  const intro = `Mortgage helper homes in ${location} feature a self-contained basement or garden suite whose rental income — typically $1,500 to $2,500 per month — helps offset your monthly mortgage payment. In one of Canada's most expensive real estate markets, a well-chosen suite home can reduce your effective carrying costs by 25–35%. ${agentFirstName} can identify properties where the suite quality, legal status, and rental income potential add up to a strong financial case.`

  const seoFooter = (
    <div>
      <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
          Frequently Asked Questions — Mortgage Helper Homes
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
        <a href={`${agentPrefix}/houses-for-sale/legal-suite`} style={{ color: 'var(--accent)', marginRight: 12 }}>Legal Suite Homes</a>
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
        suiteParams={{ with_suite: '1' }}
        lockedIntro={intro}
        lockedH1={`Mortgage Helper Homes for Sale in ${location}`}
        seoFooter={seoFooter}
      />
    </>
  )
}
