'use client'

import { useAgentPrefix } from '@/lib/agent-context'

interface Props {
  agentName: string
  brokerage: string
  phone: string | null
  yearsExperience: string | null
  blurb: string | null
  awards: string[]
  variant: 'card' | 'inline'
}

/**
 * Renders the site-wide agent value-prop / CTA block. See AgentValuePropCta.tsx
 * (server wrapper) for the data-sourcing contract — this component only renders
 * what it's given, it never fabricates copy.
 */
export default function AgentValuePropCtaClient({
  agentName,
  brokerage,
  phone,
  yearsExperience,
  blurb,
  awards,
  variant,
}: Props) {
  const agentPrefix = useAgentPrefix()
  const firstName = agentName.split(' ')[0]

  if (variant === 'inline') {
    return (
      <div
        style={{
          background: 'var(--primary-bg)',
          padding: '32px var(--container-padding)',
        }}
      >
        <div
          className="container avpc-inline"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div style={{ flex: '1 1 320px' }}>
            <p style={{ margin: 0, fontSize: 15, color: '#fff', lineHeight: 1.6, fontWeight: 500 }}>
              {blurb || `Have questions about this market? ${firstName} can help.`}
            </p>
            {(yearsExperience || awards.length > 0) && (
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
                {[
                  yearsExperience ? `${yearsExperience} years experience` : null,
                  ...awards,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
          {phone && (
            <a
              href={`tel:${phone}`}
              style={{
                display: 'inline-block',
                flexShrink: 0,
                padding: '13px 28px',
                background: 'var(--cta-primary)',
                color: 'var(--cta-primary-text)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              Call {firstName} · {phone}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="avpc-card"
      style={{
        background: '#f8f7f4',
        border: '1px solid #e8e4dc',
        borderRadius: 8,
        padding: '32px 36px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 28,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ flex: '1 1 380px', minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 10,
          }}
        >
          Why work with {firstName}
        </p>
        <p style={{ margin: 0, fontSize: 16, color: '#1a1a1a', lineHeight: 1.65, fontWeight: 500 }}>
          {blurb || (yearsExperience ? `${yearsExperience} years helping buyers and sellers in the area.` : 'Real estate expertise you can count on — reach out any time.')}
        </p>
        {(yearsExperience || awards.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 14 }}>
            {yearsExperience && (
              <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                {yearsExperience} years experience
              </span>
            )}
            {awards.map((a) => (
              <span key={a} style={{ fontSize: 13, color: '#4b5563' }}>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
      {phone && (
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <a
            href={`tel:${phone}`}
            style={{
              display: 'inline-block',
              padding: '14px 30px',
              background: 'var(--cta-primary)',
              color: 'var(--cta-primary-text)',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            Call {phone}
          </a>
          <a
            href={`${agentPrefix}/contact`}
            style={{
              fontSize: 13,
              color: '#4b5563',
              textDecoration: 'underline',
            }}
          >
            or send a message
          </a>
        </div>
      )}
    </div>
  )
}
