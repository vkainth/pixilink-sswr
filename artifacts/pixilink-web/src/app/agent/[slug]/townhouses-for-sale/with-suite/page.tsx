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
    getListings(slug, { status: 'Active', type: 'Townhouse', with_suite: true, limit: 1 }),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain    = agentCanonicalBase(agent)
  const location  = agentAreaDisplay(territories)
  const canonical = `https://${domain}/townhouses-for-sale/with-suite`
  const title     = `${listings.total} Townhouses with Suite for Sale in ${location} | ${agentName}`
  const description = `Browse townhouses with a secondary suite or lock-off unit for sale in ${location}. A suite in a townhouse can generate $1,200–$1,800/mo in rental income — an increasingly popular mortgage helper option. Live MLS® listings updated every 5 minutes.`
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
      name: 'Can townhouses have secondary suites?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Some townhouse builders now include a separate ground-floor unit or basement "lock-off suite" that has its own entrance, kitchen, and bathroom. These suites are designed as self-contained rental units or flex spaces for in-laws or adult children. Not all strata complexes allow secondary suites — check the strata bylaws before purchasing to confirm that suites and rentals are permitted. Strata complexes that do allow suites typically require the unit to meet BC Building Code standards and may limit the number of permissible rentals in the complex.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a lock-off suite in a townhouse?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A lock-off suite (or lock-off unit) is a self-contained area within a townhouse that can be accessed independently from the main living space — typically through a separate exterior door. The suite includes its own kitchen, bathroom, and sleeping area. When the primary occupant wants the space back, the connecting interior door (if present) is opened and the suite is reintegrated into the main home. Lock-off suites provide flexibility: rent the suite when you want income, use it yourself when you need the space.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does a townhouse suite rent for in Metro Vancouver?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A ground-floor suite or lock-off unit in a Metro Vancouver townhouse typically rents for $1,200 to $1,800 per month, depending on location, size, and finishings. One-bedroom suites command $1,200 to $1,500; two-bedroom suites with a separate entrance and in-suite laundry can reach $1,600 to $1,800. While this is less than a detached-home basement suite, it still meaningfully offsets a portion of the monthly strata fees and mortgage payment.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does the strata need to approve renting out a suite?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Strata corporations in BC cannot prohibit rentals in complexes where rental restrictions were not in place at the time of purchase, following 2021 legislative changes (Bill 44). However, strata bylaws may still restrict the number of units that can be rented simultaneously, short-term rentals (Airbnb), and suite configurations. Always review the strata bylaws and minutes for any rental restriction history, and confirm that a suite is permitted under the complex\'s rules before assuming rental income is available.',
      },
    },
  ],
}

export default async function TownhousesWithSuitePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const location = agentAreaDisplay(territories)
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  const agentFirstName = (agent?.name || 'Your Realtor').split(' ')[0]

  const intro = `Browse townhouses with a secondary suite or lock-off unit for sale in ${location}. An increasing number of new townhouse developments include a self-contained ground-floor suite with its own entrance and kitchen, generating $1,200 to $1,800 per month in rental income. ${agentFirstName} can help you identify suite-equipped townhomes, review the strata bylaws, and assess whether the rental income is permitted and sustainable.`

  const seoFooter = (
    <div>
      <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
          Frequently Asked Questions — Townhouses with Suite
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
        <a href={`${agentPrefix}/houses-for-sale/with-suite`} style={{ color: 'var(--accent)', marginRight: 12 }}>Houses with Suite</a>
        <a href={`${agentPrefix}/houses-for-sale/legal-suite`} style={{ color: 'var(--accent)', marginRight: 12 }}>Legal Suite Homes</a>
        <a href={`${agentPrefix}/townhouses-for-sale`} style={{ color: 'var(--accent)' }}>All Townhouses</a>
      </div>
    </div>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ListingsCore
        slug={slug}
        sp={sp}
        lockedType="Townhouse"
        suiteParams={{ with_suite: '1' }}
        lockedIntro={intro}
        lockedH1={`Townhouses with Suite for Sale in ${location}`}
        seoFooter={seoFooter}
      />
    </>
  )
}
