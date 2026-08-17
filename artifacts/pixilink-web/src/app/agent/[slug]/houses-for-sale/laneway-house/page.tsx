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
    getListings(slug, { status: 'Active', type: 'House', laneway_house: true, limit: 1 }),
  ])
  const agentName = agent?.name || 'Your Local Realtor'
  const domain    = agentCanonicalBase(agent)
  const location  = agentAreaDisplay(territories)
  const canonical = `https://${domain}/houses-for-sale/laneway-house`
  const title     = `${listings.total} Laneway Houses for Sale in ${location} | ${agentName}`
  const description = `Browse properties with a laneway house for sale in ${location}. A laneway home is a detached dwelling at the rear of a lot accessed from the back lane — generating premium rental income and supporting multi-generational living. Live MLS® data with ${agentName}.`
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
      name: 'What is a laneway house?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A laneway house is a small, detached dwelling unit built at the rear of a residential lot with access from the back lane. It is fully self-contained — with its own kitchen, bathroom, and entrance — and completely separate from the main home on the property. Laneway houses were popularized in Vancouver as a way to increase gentle density in established neighbourhoods without changing street character. They are now common in parts of Surrey, Langley, and other Metro Vancouver municipalities that have adopted infill housing policies.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are laneway houses legal in Surrey, BC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Laneway houses are permitted in some Surrey zones — particularly the RF zone (Single Family Residential with Lane) — subject to strict size, height, setback, and design standards. Not all Surrey lots qualify; the property must have rear lane access and meet minimum lot size requirements. The City of Surrey requires a development permit and building permit for any laneway house. Always verify zoning and lane access before purchasing a property advertised as having a laneway house.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does a laneway house rent for in South Surrey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A laneway house in South Surrey and White Rock typically rents for $1,800 to $2,600 per month, depending on size, finish level, and neighbourhood. One-bedroom laneway units start around $1,600 to $1,900; two-bedroom units in desirable areas like Semiahmoo, White Rock, or Morgan Creek can command $2,200 to $2,600. The premium over a basement suite reflects the complete separation and private outdoor space a laneway home often provides.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is a laneway house different from a garden suite or secondary suite?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A laneway house is fully detached and accessed from the rear lane — it has no structural connection to the main home. A garden suite is also a detached structure in the backyard but does not require lane access (it may have a side-yard or rear-yard gate entry). A secondary suite is part of the main home itself — usually a basement or basement apartment within the same building envelope. In terms of rental income and tenant privacy, laneway houses and garden suites typically command higher rents because of their complete separation from the landlord\'s living space.',
      },
    },
  ],
}

export default async function LanewayHousePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const [agent, territories] = await Promise.all([getAgent(slug), getAgentTerritories(slug)])
  const location = agentAreaDisplay(territories)
  const regionSlug = regionSlugForAgent(slug)
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
  const agentFirstName = (agent?.name || 'Your Realtor').split(' ')[0]

  const intro = `A laneway house is a fully detached dwelling at the rear of a property, accessed from the back lane and completely separate from the main home. Properties with a laneway house in ${location} are rare and highly sought after — combining the appeal of an estate-lot home with premium rental income of $1,800 to $2,600 per month. ${agentFirstName} can identify laneway house properties, verify municipal permits, and evaluate the income and lifestyle benefit before you make an offer.`

  const seoFooter = (
    <div>
      <section style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 32px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
          Frequently Asked Questions — Laneway Houses
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
        <a href={`${agentPrefix}/houses-for-sale/coach-home`} style={{ color: 'var(--accent)', marginRight: 12 }}>Coach Homes</a>
        <a href={`${agentPrefix}/houses-for-sale/with-suite`} style={{ color: 'var(--accent)', marginRight: 12 }}>All Suite Homes</a>
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
        suiteParams={{ laneway_house: '1' }}
        lockedIntro={intro}
        lockedH1={`Laneway Houses for Sale in ${location}`}
        seoFooter={seoFooter}
      />
    </>
  )
}
