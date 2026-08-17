import { headers } from 'next/headers'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAgent, getBestOfLists, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) return {}
  const title = `Best Of Guides | ${agent.name}`
  const description = `Staff-curated "best of" lists of top condo buildings and neighbourhoods, put together by ${agent.name}.`
  return { title, description }
}

export default async function BestOfIndexPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, lists] = await Promise.all([getAgent(slug), getBestOfLists(slug)])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const published = lists.filter(l => l.status === 'published')

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <div style={{ background: '#fff', padding: '40px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>Best Of</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
            Best Of Guides
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 700, lineHeight: 1.8, margin: 0 }}>
            Curated rankings of the top condo buildings and neighbourhoods, based on {agent.name.split(' ')[0]}'s
            hands-on local expertise — not an algorithm.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 64px' }}>
        {published.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No best-of guides published yet. Check back soon.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
            {published.map(l => (
              <a key={l.id} href={ap(`/best/${l.slug}`)} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                padding: '24px 22px', textDecoration: 'none', display: 'block',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {l.kind === 'building' ? 'Buildings' : 'Neighbourhoods'} · {l.items.length} picks
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 10px', lineHeight: 1.3 }}>
                  {l.title}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {l.intro.slice(0, 140)}{l.intro.length > 140 ? '…' : ''}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>

      <PageQuickLinks slug={slug} />
    </div>
  )
}
