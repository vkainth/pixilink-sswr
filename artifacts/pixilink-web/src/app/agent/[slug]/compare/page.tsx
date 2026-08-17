import { headers } from 'next/headers'
import { requireNotShowcase } from '@/lib/showcase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getAgent, getAreaComparisons, resolveAgentPrefix } from '@/lib/api'
import PageQuickLinks from '@/components/PageQuickLinks'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgent(slug)
  if (!agent) return {}
  const title = `Area Comparisons | ${agent.name}`
  const description = `Side-by-side comparisons of neighbourhoods served by ${agent.name} — helping you decide where to buy.`
  return { title, description }
}

export default async function AreaComparisonsIndexPage({ params }: Props) {
  const { slug } = await params
  const hdrs = await headers()
  const agentPrefix = resolveAgentPrefix(slug, hdrs.get('x-agent-prefix'))
  const ap = (p: string) => `${agentPrefix}${p}`

  const [agent, comparisons] = await Promise.all([getAgent(slug), getAreaComparisons(slug)])
  if (!agent) notFound()
  requireNotShowcase(agent)

  const published = comparisons.filter(c => c.status === 'published')

  return (
    <div style={{ background: 'var(--off-white)', minHeight: '100vh' }}>
      <div style={{ background: '#fff', padding: '40px 0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            <a href={ap('/')} style={{ color: '#888', textDecoration: 'none' }}>Home</a>
            <span style={{ margin: '0 6px' }}>›</span>
            <span>Area Comparisons</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 800, color: 'var(--primary-bg)', margin: '0 0 16px' }}>
            Area Comparisons
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 700, lineHeight: 1.8, margin: 0 }}>
            Weighing two neighbourhoods against each other? These side-by-side guides break down the pros, cons and
            buyer profile for each area to help you decide.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '48px var(--container-padding) 64px' }}>
        {published.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No area comparisons published yet. Check back soon.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
            {published.map(c => (
              <a key={c.id} href={ap(`/compare/${c.slug}`)} style={{
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
                padding: '24px 22px', textDecoration: 'none', display: 'block',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {c.area_a_label} vs {c.area_b_label}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-bg)', margin: '0 0 10px', lineHeight: 1.3 }}>
                  {c.title}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {c.intro.slice(0, 140)}{c.intro.length > 140 ? '…' : ''}
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
