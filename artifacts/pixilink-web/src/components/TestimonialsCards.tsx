import type { AgentTestimonial } from '@/lib/types'

interface Props {
  testimonials: AgentTestimonial[]
}

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24"
          fill={i < n ? 'var(--accent)' : 'none'} stroke={i < n ? 'var(--accent)' : '#d1d5db'} strokeWidth="1.5">
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

export default function TestimonialsCards({ testimonials }: Props) {
  if (!testimonials.length) return null

  return (
    <section style={{ padding: '80px 0', background: '#fff' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10, fontWeight: 700 }}>
            Client Reviews
          </div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: 'var(--primary-bg)', margin: 0 }}>
            What Clients Say
          </h2>
        </div>

        <div className="testimonials-cards-grid">
          {testimonials.map(t => {
            const label = sourceLabel(t.source)
            return (
              <div key={t.id} style={{
                background: 'var(--off-white)',
                borderRadius: 12,
                padding: '32px 28px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {t.rating > 0 && <Stars n={t.rating} />}
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)', flex: 1, marginBottom: 24, fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--primary-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', fontWeight: 700, fontSize: 16, flexShrink: 0,
                  }}>
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-bg)' }}>{t.name}</div>
                    {label && (
                      t.source_url
                        ? <a href={t.source_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginTop: 2, display: 'block' }}>
                            {label}
                          </a>
                        : <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`
        .testimonials-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        @media (max-width: 640px) {
          .testimonials-cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
