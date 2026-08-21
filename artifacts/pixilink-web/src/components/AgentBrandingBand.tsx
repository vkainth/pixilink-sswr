import type { AgentProfile } from '@/lib/types'
import { avatarUrl } from '@/lib/types'

type CoAgent = { name: string; photo: string }

interface Props {
  agent: AgentProfile
  ctaHref: string
  coAgents?: CoAgent[]
}

export default function AgentBrandingBand({ agent, ctaHref, coAgents }: Props) {
  const isDual = !!coAgents && coAgents.length > 0
  const coAgent = isDual ? coAgents![0] : null

  const photoSrc = agent.photo_path ? avatarUrl(agent.photo_path, 400) : null
  const coPhotoSrc = coAgent?.photo ? avatarUrl(coAgent.photo, 400) : null

  const firstName = agent.name.split(' ')[0]
  const coFirstName = coAgent ? coAgent.name.split(' ')[0] : null
  const displayName = isDual && coFirstName ? `${firstName} & ${coFirstName}` : agent.name

  return (
    <div style={{
      background: 'var(--primary-bg)',
      width: '100%',
      padding: '36px 0',
    }}>
      <div className="container">
        <div className="agent-branding-band-inner" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          flexWrap: 'wrap',
        }}>
          {/* Agent photo(s) */}
          <div style={{ flexShrink: 0 }}>
            {isDual && coPhotoSrc ? (
              <div style={{ position: 'relative', width: 96, height: 80 }}>
                <img
                  src={coPhotoSrc}
                  alt={coAgent!.name}
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: 0,
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: '50% 20%',
                    border: '3px solid var(--primary-bg)',
                  }}
                />
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={agent.name}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      objectPosition: '50% 20%',
                      border: '3px solid var(--accent)',
                    }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-bg)',
                    fontWeight: 800,
                    fontSize: 26,
                    border: '3px solid var(--accent)',
                  }}>
                    {agent.name.charAt(0)}
                  </div>
                )}
              </div>
            ) : photoSrc ? (
              <img
                src={photoSrc}
                alt={agent.name}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  objectPosition: '50% 20%',
                  border: '3px solid var(--accent)',
                }}
              />
            ) : (
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-bg)',
                fontWeight: 800,
                fontSize: 28,
              }}>
                {agent.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Name + brokerage + trust line */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 2 }}>
              {displayName}
            </div>
            <div style={{ color: 'var(--accent)', fontSize: 12, letterSpacing: '0.04em', marginBottom: 8 }}>
              {agent.brokerage}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              {isDual
                ? `${firstName} & ${coFirstName} bring combined local expertise to help buyers find value and sellers maximize their return.`
                : agent.bio
                  ? agent.bio.split(/[.!?]/)[0].trim() + '.'
                  : `${firstName} specializes in this local market — helping buyers find value and sellers maximize their return.`}
            </p>
          </div>

          {/* CTA button */}
          <div style={{ flexShrink: 0 }}>
            <a
              href={ctaHref}
              style={{
                display: 'inline-block',
                background: 'var(--accent)',
                color: 'var(--primary-bg)',
                padding: '13px 26px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Get a Free CMA
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .agent-branding-band-inner {
            flex-direction: column !important;
            text-align: center;
            align-items: center !important;
          }
          .agent-branding-band-inner > div:last-child {
            width: 100%;
            text-align: center;
          }
          .agent-branding-band-inner a {
            width: 100%;
            text-align: center;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  )
}
