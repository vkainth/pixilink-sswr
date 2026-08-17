import type { AgentFaq } from '@/lib/types'

interface Props {
  faqs: AgentFaq[]
  agentName: string
  siteUrl: string
}

export default function AgentFaqSection({ faqs, agentName, siteUrl }: Props) {
  if (faqs.length === 0) return null

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <section
      aria-label="Frequently asked questions"
      style={{ background: '#fff', padding: '80px 0', borderTop: '1px solid #e8eaed' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Common Questions
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: 'clamp(26px,3.5vw,40px)',
              fontWeight: 700,
              color: 'var(--primary-bg)',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Frequently Asked Questions
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-muted)',
              marginTop: 12,
              lineHeight: 1.7,
            }}
          >
            Questions {agentName.split(' ')[0]} hears most often from buyers and sellers.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {faqs.map((faq, idx) => (
            <article
              key={idx}
              itemScope
              itemType="https://schema.org/Question"
              style={{
                borderTop: '1px solid #e8eaed',
                paddingTop: 28,
                paddingBottom: 28,
              }}
            >
              <h3
                itemProp="name"
                style={{
                  fontFamily: "'Playfair Display',Georgia,serif",
                  fontSize: 'clamp(17px,2vw,20px)',
                  fontWeight: 700,
                  color: 'var(--primary-bg)',
                  margin: '0 0 12px',
                  lineHeight: 1.3,
                }}
              >
                {faq.question}
              </h3>
              <div
                itemScope
                itemType="https://schema.org/Answer"
                itemProp="acceptedAnswer"
              >
                <p
                  itemProp="text"
                  style={{
                    fontSize: 15,
                    color: 'var(--text-muted)',
                    lineHeight: 1.8,
                    margin: 0,
                  }}
                >
                  {faq.answer}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: '1px solid #e8eaed',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <a
            href={`${siteUrl}/contact`}
            style={{
              display: 'inline-block',
              background: 'var(--primary-bg)',
              color: '#fff',
              padding: '13px 28px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.5,
              textDecoration: 'none',
            }}
          >
            Ask {agentName.split(' ')[0]} a Question
          </a>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No obligation · Usually replies within a few hours
          </span>
        </div>
      </div>
    </section>
  )
}
