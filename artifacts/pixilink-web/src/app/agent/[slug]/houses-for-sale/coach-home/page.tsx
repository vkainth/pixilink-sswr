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
    getListings(slug, { status: 'Active', type: 'House', coach_home: true, limit: 1 }),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain    = agentCanonicalBase(agent)
  const location  = agentAreaDisplay(territories)
  const canonical = `https://${domain}/houses-for-sale/coach-home`
  const title     = `${listings.total} Houses with Coach Home for Sale in ${location} | ${agentName}`
  const description = `Find properties with a detached coach home or carriage house in ${location}. A coach home provides a fully separate dwelling — ideal for multi-generational families or premium rental income. Live MLS® listings updated every 5 minutes.`
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
      name: 'What is a coach home?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A coach home (also called a carriage house or coach house) is a detached accessory dwelling unit (ADU) located on the same lot as a primary residence — typically above or beside a detached garage, or as a separate structure at the rear of the property. Unlike a basement suite, a coach home is fully detached from the main house, which provides complete separation and often commands higher rents. Coach homes are common in larger-lot neighbourhoods in South Surrey such as Elgin Chantrell, Morgan Creek, and Ocean Park.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is a coach home different from a laneway house?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Both are detached accessory dwelling units, but the key difference is location and access. A laneway house sits at the rear of a property with access from a back lane. A coach home is typically a self-contained unit above or beside a detached garage and does not require lane access — making them feasible on properties that don\'t have lane frontage. Functionally, both serve as independent dwellings with their own entrance, kitchen, and bathroom, and both can generate rental income.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much rental income does a coach home generate?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A detached coach home in South Surrey typically rents for $1,800 to $2,800 per month, depending on size and finishings. Because a coach home is fully detached and offers more privacy than a basement suite, it tends to command a premium — often $400 to $600 per month more than a comparable basement suite. A well-finished two-bedroom coach home in a desirable area like Elgin Chantrell could rent for $2,500 to $3,000 per month.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are coach homes legal in Surrey, BC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, but they require the appropriate zoning and permits. The City of Surrey allows detached accessory dwelling units in certain residential zones, subject to size limits, setback requirements, and design standards. Before purchasing a property advertised with a "coach home", verify that the structure was permitted by the city and has received occupancy approval. Unpermitted coach homes carry the same risks as unauthorized basement suites — potential eviction orders and insurance coverage gaps.',
      },
    },
  ],
}

export default async function CoachHomePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const location = agentAreaDisplay(territories)
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  const agentFirstName = (agent?.name || 'Your Realtor').split(' ')[0]

  const intro = `A coach home (also called a carriage house) is a fully detached secondary dwelling — typically above a garage or as a separate rear structure — that provides complete privacy from the main home. Properties with a coach home in ${location} are highly sought after for multi-generational living and premium rental income, often generating $1,800 to $2,800 per month. ${agentFirstName} can help you identify coach home properties, verify permits, and assess income potential.`

  const seoFooter = (
    <div>
      <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
          Frequently Asked Questions — Coach Home Properties
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
        <a href={`${agentPrefix}/houses-for-sale/laneway-house`} style={{ color: 'var(--accent)', marginRight: 12 }}>Laneway Houses</a>
        <a href={`${agentPrefix}/houses-for-sale/legal-suite`} style={{ color: 'var(--accent)' }}>Legal Suite Homes</a>
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
        suiteParams={{ coach_home: '1' }}
        lockedIntro={intro}
        lockedH1={`Houses with Coach Home for Sale in ${location}`}
        seoFooter={seoFooter}
      />
    </>
  )
}
