import type { AgentTestimonial } from '@/lib/types'

interface Props {
  testimonials: AgentTestimonial[]
}

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
          fill={i < n ? '#111111' : 'none'} stroke={i < n ? '#111111' : '#d1d5db'} strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

function sourceLabel(source: string): string {
  switch (source.toLowerCase()) {
    case 'rankmyagent': return 'via RankMyAgent'
    case 'rew':         return 'via REW'
    case 'realtylink':  return 'via Realtylink'
    case 'google':      return 'via Google'
    case 'manual':      return ''
    default:            return source ? `via ${source}` : ''
  }
}

export default function TestimonialsStrip({ testimonials }: Props) {
  if (!testimonials.length) return null

  return (
    <section style={{ padding: '72px 0', background: 'var(--off-white)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            Client Reviews
          </div>
          <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, color: 'var(--primary-bg)' }}>
            What Clients Say
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 24 }}>
          {testimonials.map(t => {
            const label = sourceLabel(t.source)
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 10, padding: '28px 28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {t.rating > 0 && <Stars n={t.rating} />}
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 20, fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{t.name}</div>
                    {label && (
                      t.source_url
                        ? <a href={t.source_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                            {label}
                          </a>
                        : <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
