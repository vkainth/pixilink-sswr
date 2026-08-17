import { playfair } from '@/lib/fonts'
import { headers } from 'next/headers'
import { getAgent, resolveAgentPrefix } from '@/lib/api'
import { getAiPages } from '@/lib/ai-pages-api'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ContactSidebarForm from '@/components/ContactSidebarForm'


interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) return { title: 'Guides' }
  return {
    title: `Neighbourhood Guides — ${agent.name}`,
    description: `Lifestyle and neighbourhood guides for the area from ${agent.name}.`,
  }
}

export default async function GuideIndexPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const agent = await getAgent(slug)
  if (!agent) notFound()
  requireNotShowcase(agent)

  const lifestyleEnabled = agent.features?.lifestyle_seo ?? false
  if (!lifestyleEnabled) notFound()

  const pages = await getAiPages(slug, 'lifestyle_seo')

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <style>{`.guide-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }`}</style>
      <div style={{ background: '#fff', padding: '48px 0 40px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 12, fontWeight: 500 }}>Neighbourhood Guides</div>
          <h1 className={playfair.className} style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', margin: 0 }}>
            Neighbourhood Guides
          </h1>
          <p style={{ color: '#555', fontSize: 15, marginTop: 14, lineHeight: 1.7, marginBottom: 0 }}>
            In-depth lifestyle and real estate guides for every neighbourhood we serve.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 80px' }}>
        {pages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px 0', fontSize: 15 }}>
            Neighbourhood guides are being prepared — check back soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {pages.map((page) => (
              <a
                key={page.slug}
                href={ap(`/guide/${page.slug}`)}
                className="guide-card"
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--accent)',
                  borderRadius: 10,
                  padding: '24px 26px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  transition: 'box-shadow .15s, transform .15s',
                }}
              >
                {page.subarea && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                    {page.subarea}
                  </div>
                )}
                <div className={playfair.className} style={{ fontSize: 19, fontWeight: 400, color: 'var(--primary-bg)', marginBottom: 10, lineHeight: 1.3 }}>
                  {page.title}
                </div>
                {page.meta_description && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, flex: 1 }}>
                    {page.meta_description.slice(0, 140)}{page.meta_description.length > 140 ? '…' : ''}
                  </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.04em' }}>Read guide →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
