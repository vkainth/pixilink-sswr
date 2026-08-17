import { playfair } from '@/lib/fonts'
import { getAgent, getAgentTerritories, agentAreaDisplay } from '@/lib/api'
import ContactSidebarForm from '@/components/ContactSidebarForm'
import { imgUrl, getCoAgents, resolveSiteConfig } from '@/lib/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const SC_CHARCOAL  = '#1C1C1E'
const SC_GOLD      = '#9B8B7A'
const SC_OFF_WHITE = '#F5F3F0'
const PLAYFAIR_SC = { fontFamily: "'Playfair Display',Georgia,serif" } as const


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  const shortArea = agentAreaDisplay(territories)
  const coAgents = agent ? getCoAgents(agent) : []
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null
  const coFirstName = coAgent?.name.split(' ')[0] ?? ''
  const firstName = agent?.name.split(' ')[0] ?? ''

  const title = isDualAgent
    ? `Contact ${firstName} & ${coFirstName} — ${shortArea} REALTORS®`
    : `Contact ${agent?.name || 'Your Agent'} — ${shortArea} REALTOR®`
  const description = isDualAgent
    ? `Get in touch with ${firstName} & ${coFirstName} for showings, market evaluations and real estate questions. Serving ${shortArea}.`
    : `Get in touch with ${agent?.name || 'your local realtor'} for showings, market evaluations and real estate questions. Serving ${shortArea}.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function ContactPage({ params }: Props) {
  const { slug } = await params
  const [agent, territories] = await Promise.all([
    getAgent(slug),
    getAgentTerritories(slug).catch(() => []),
  ])
  if (!agent) notFound()

  const shortArea = agentAreaDisplay(territories)
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 600) : null

  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const coAgent = coAgents[0] || null
  const firstName = agent.name.split(' ')[0]
  const coFirstName = coAgent?.name.split(' ')[0] ?? ''

  const customDomain = agent.settings?.custom_domain
  const canonicalBase = customDomain ? `https://${customDomain}` : `https://${agent.slug}.pixilink.com`
  const agentId = `${canonicalBase}/#agent`
  const officeAddress = agent.settings?.office_address ?? null
  const responseTime = agent.settings?.response_time ?? 'promptly'

  const primaryAgentNode = {
    '@type': 'RealEstateAgent',
    '@id': agentId,
    name: agent.name,
    telephone: agent.phone,
    ...(agent.email ? { email: agent.email } : {}),
    ...(photoSrc ? { image: photoSrc } : {}),
    ...(officeAddress ? { address: { '@type': 'PostalAddress', streetAddress: officeAddress } } : {}),
  }

  const jsonLd = isDualAgent && coAgent
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          primaryAgentNode,
          {
            '@type': 'RealEstateAgent',
            name: coAgent.name,
            telephone: coAgent.phone,
            ...(coAgent.email ? { email: coAgent.email } : {}),
            ...(coAgent.photo ? { image: imgUrl(coAgent.photo, 600) } : {}),
          },
          {
            '@type': 'ContactPage',
            '@id': `${canonicalBase}/contact`,
            url: `${canonicalBase}/contact`,
            name: `Contact ${firstName} & ${coFirstName}`,
            description: `Reach ${firstName} & ${coFirstName} for real estate inquiries, showing requests and market evaluations in ${shortArea}.`,
            mainEntity: { '@id': agentId },
          },
        ],
      }
    : {
        '@context': 'https://schema.org',
        '@graph': [
          primaryAgentNode,
          {
            '@type': 'ContactPage',
            '@id': `${canonicalBase}/contact`,
            url: `${canonicalBase}/contact`,
            name: `Contact ${agent.name}`,
            description: `Reach ${agent.name} for real estate inquiries, showing requests and market evaluations in ${shortArea}.`,
            mainEntity: { '@id': agentId },
          },
        ],
      }

  const isShowcasePreset = resolveSiteConfig(agent).layout_preset === 'showcase'

  if (isShowcasePreset) {
    return (
      <div style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif", overflowX: 'hidden' }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* Hero band — charcoal */}
        <div style={{ background: SC_CHARCOAL }}>
          <div style={{ height: 3, background: `linear-gradient(90deg,${SC_GOLD} 0%,#c4b09a 50%,${SC_GOLD} 100%)` }} />
          <div className="container" style={{ padding: 'clamp(48px,8vw,72px) var(--container-padding)' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Get in Touch</p>
            <h1 style={{ ...PLAYFAIR_SC, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, color: '#fff', lineHeight: 1.15, margin: '0 0 16px' }}>
              {isDualAgent ? 'Contact Us' : `Contact ${agent.name}`}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, maxWidth: 520, margin: 0 }}>
              {isDualAgent && coAgent
                ? `Reach out to ${firstName} & ${coFirstName} — we'll respond promptly.`
                : `Questions about a listing? Ready to book a showing? We'll get back to you promptly.`}
            </p>

            {/* Agent strip inside hero */}
            <div className="sc-contact-agents" style={{ display: 'flex', gap: 32, marginTop: 40, flexWrap: 'wrap' }}>
              {/* Primary agent */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {photoSrc ? (
                  <img src={photoSrc} alt={agent.name}
                    style={{ width: 72, height: 88, objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 0}%`, borderRadius: 4, border: `2px solid ${SC_GOLD}`, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 72, height: 88, borderRadius: 4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>👤</div>
                )}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: SC_GOLD, marginBottom: 10, fontWeight: 500 }}>{agent.brokerage}</div>
                  <a href={`tel:${agent.phone}`} style={{ fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'block' }}>
                    {agent.phone}
                  </a>
                  {agent.email && (
                    <a href={`mailto:${agent.email}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', wordBreak: 'break-all' }}>
                      {agent.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Co-agent */}
              {isDualAgent && coAgent && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {coAgent.photo ? (
                    <img src={imgUrl(coAgent.photo, 600)} alt={coAgent.name}
                      style={{ width: 72, height: 88, objectFit: 'cover', objectPosition: '50% 0%', borderRadius: 4, border: `2px solid ${SC_GOLD}`, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 72, height: 88, borderRadius: 4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>👤</div>
                  )}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{coAgent.name}</div>
                    <div style={{ fontSize: 12, color: SC_GOLD, marginBottom: 10, fontWeight: 500 }}>{coAgent.title || agent.brokerage}</div>
                    {coAgent.phone && (
                      <a href={`tel:${coAgent.phone}`} style={{ fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'block' }}>
                        {coAgent.phone}
                      </a>
                    )}
                    {coAgent.email && (
                      <a href={`mailto:${coAgent.email}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', wordBreak: 'break-all' }}>
                        {coAgent.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body — off-white */}
        <div style={{ background: SC_OFF_WHITE, padding: 'clamp(48px,8vw,72px) 0' }}>
          <div className="container">
            <div className="sc-contact-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 56, alignItems: 'start' }}>

              {/* Left: What to Expect */}
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.25em', color: SC_GOLD, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>What to Expect</p>
                <h2 style={{ ...PLAYFAIR_SC, fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', fontWeight: 400, color: SC_CHARCOAL, marginBottom: 32, lineHeight: 1.2 }}>
                  Straightforward, Responsive Service
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { icon: '⚡', title: 'Fast Response', text: `We respond ${responseTime} — never left waiting.` },
                    { icon: '🏠', title: 'Any Listing', text: 'Book a showing for any property on the market, even ones not listed on this site.' },
                    { icon: '📊', title: 'Free Home Evaluation', text: 'Get a real Comparative Market Analysis based on MLS® data — not an automated estimate.' },
                    { icon: '💬', title: 'No Pressure', text: 'Straight answers to your questions. No scripts, no hard sell.' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 4, background: SC_CHARCOAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: SC_CHARCOAL, marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.65 }}>{item.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: form */}
              <div>
                <ContactSidebarForm agent={agent} coAgents={coAgents} />
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .sc-contact-layout { grid-template-columns: 1fr !important; }
            .sc-contact-agents { flex-direction: column !important; gap: 20px !important; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Get in Touch</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(24px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
            {isDualAgent ? 'Contact Us' : `Contact ${agent.name}`}
          </h1>
          <p style={{ color: '#555', marginTop: 14, fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
            {isDualAgent && coAgent
              ? `Reach out to ${firstName} & ${coFirstName} — we'll get back to you promptly.`
              : `Questions about a listing? Ready to book a showing? We'll get back to you promptly.`}
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '56px var(--container-padding)' }}>
        <div className="contact-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56 }}>
          {/* Left: info */}
          <div>
            {isDualAgent && coAgent ? (
              /* Dual-agent cards */
              <div className="dual-agent-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                {/* Primary agent card */}
                <div className="agent-card" style={{ background: '#fff', borderRadius: 10, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
                  {photoSrc ? (
                    <img src={photoSrc} alt={agent.name}
                      style={{ width: 120, height: 148, objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 0}%`, borderRadius: 8, border: '2px solid var(--accent)', marginBottom: 16 }} />
                  ) : (
                    <div style={{ width: 120, height: 148, borderRadius: 8, background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 16 }}>👤</div>
                  )}
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>{agent.name}</h2>
                  <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 16, fontWeight: 500 }}>{agent.brokerage}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    <a href={`tel:${agent.phone}`} style={{ display: 'flex', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--primary-bg)', textDecoration: 'none', justifyContent: 'center' }}>
                      📞 {agent.phone}
                    </a>
                    {agent.email && (
                      <a href={`mailto:${agent.email}`} style={{ display: 'flex', gap: 6, fontSize: 13, color: 'var(--text)', textDecoration: 'none', justifyContent: 'center', wordBreak: 'break-all' }}>
                        ✉️ {agent.email}
                      </a>
                    )}
                  </div>
                </div>

                {/* Co-agent card */}
                <div className="agent-card" style={{ background: '#fff', borderRadius: 10, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
                  {coAgent.photo ? (
                    <img src={imgUrl(coAgent.photo, 600)} alt={coAgent.name}
                      style={{ width: 120, height: 148, objectFit: 'cover', objectPosition: '50% 0%', borderRadius: 8, border: '2px solid var(--accent)', marginBottom: 16 }} />
                  ) : (
                    <div style={{ width: 120, height: 148, borderRadius: 8, background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 16 }}>👤</div>
                  )}
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>{coAgent.name}</h2>
                  <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 16, fontWeight: 500 }}>{coAgent.title || agent.brokerage}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    {coAgent.phone && (
                      <a href={`tel:${coAgent.phone}`} style={{ display: 'flex', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--primary-bg)', textDecoration: 'none', justifyContent: 'center' }}>
                        📞 {coAgent.phone}
                      </a>
                    )}
                    {coAgent.email && (
                      <a href={`mailto:${coAgent.email}`} style={{ display: 'flex', gap: 6, fontSize: 13, color: 'var(--text)', textDecoration: 'none', justifyContent: 'center', wordBreak: 'break-all' }}>
                        ✉️ {coAgent.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Single agent card */
              <div className="agent-card" style={{ background: '#fff', borderRadius: 10, padding: '32px', marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                {photoSrc && (
                  <img src={photoSrc} alt={agent.name}
                    style={{ width: 140, height: 170, objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 0}%`, borderRadius: 8, border: '2px solid var(--accent)', flexShrink: 0 }} />
                )}
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 4 }}>{agent.name}</h2>
                  <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: 16, fontWeight: 500 }}>{agent.brokerage}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <a href={`tel:${agent.phone}`} style={{ display: 'flex', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--primary-bg)', textDecoration: 'none' }}>
                      📞 {agent.phone}
                    </a>
                    {agent.email && (
                      <a href={`mailto:${agent.email}`} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'var(--text)', textDecoration: 'none' }}>
                        ✉️ {agent.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* What to expect */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-bg)', marginBottom: 20 }}>What to Expect</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: '⚡', text: `Response — ${responseTime}` },
                  { icon: '🏠', text: 'Book a showing for any listing, even ones not on this site' },
                  { icon: '📊', text: 'Free market evaluation — get a real CMA, not an online estimate' },
                  { icon: '💬', text: 'No pressure, no scripts — just straight answers to your questions' },
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <ContactSidebarForm agent={agent} coAgents={coAgents} />
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .contact-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 700px) {
          .dual-agent-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .agent-card { flex-direction: column !important; align-items: center !important; text-align: center !important; }
          .agent-card img { width: 100px !important; height: 120px !important; }
          .agent-card > div { display: flex; flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  )
}
