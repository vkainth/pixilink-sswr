import type { AgentProfile, CoAgent, NeighbourhoodWidget } from '@/lib/types'
import { formatPriceFull, imgUrl } from '@/lib/types'
import { marketBadge } from '@/lib/market'
import PropIcon from '@/components/PropIcon'
import { regionSlugForAgent } from '@/lib/api'

interface Props {
  agent: AgentProfile
  coAgents?: CoAgent[]
  cityName: string
  respondTimeLabel?: string
  widget?: NeighbourhoodWidget | null
  buyers?: number
  agentSlug: string
}

function marketEmoji(type: string | null | undefined): string {
  if (type === 'strong-sellers') return '🔥'
  if (type === 'sellers') return '📈'
  if (type === 'buyers') return '🏠'
  return '⚖️'
}

function marketTagline(type: string | null | undefined): string {
  if (type === 'strong-sellers') return 'multiple offers expected'
  if (type === 'sellers') return 'high demand — act fast'
  if (type === 'buyers') return 'more inventory — time to negotiate'
  return 'stable conditions for buyers and sellers'
}

export default function ConversionWidget({
  agent,
  coAgents = [],
  cityName,
  respondTimeLabel = '15 min',
  widget,
  buyers = 50,
  agentSlug,
}: Props) {
  const regionSlug = agentSlug ? regionSlugForAgent(agentSlug) : null
  const agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${agentSlug}`
  const ap = (p: string) => agentSlug ? `${agentPrefix}${p}` : p
  const badge = widget ? marketBadge(widget.market_type) : null
  const isDual = coAgents.length > 0
  const firstName = agent.name.split(' ')[0]
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null

  // All agents: co-agents first, then primary (matches hero circle order)
  const allAgents: { name: string; photo: string | null; phone: string | null }[] = [
    ...coAgents.map(ca => ({
      name: ca.name,
      photo: ca.photo ? imgUrl(ca.photo, 400) : null,
      phone: ca.phone || null,
    })),
    { name: agent.name, photo: photoSrc, phone: agent.phone ?? null },
  ]

  const displayName = isDual
    ? allAgents.map(a => a.name.split(' ')[0]).join(' & ')
    : agent.name

  const ctaBtnStyle: React.CSSProperties = {
    display: 'block', width: '100%',
    padding: '10px 12px', borderRadius: 6,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.22)',
    color: '#fff', fontWeight: 700, fontSize: 12,
    textDecoration: 'none', textAlign: 'center',
    lineHeight: 1.3,
  }

  const phoneBtnStyle: React.CSSProperties = {
    display: 'block', width: '100%',
    padding: '9px 12px', borderRadius: 6,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#fff', fontWeight: 600, fontSize: 12,
    textDecoration: 'none', textAlign: 'center',
  }

  return (
    <div style={{
      background: 'var(--brand-bg)',
      borderRadius: 12,
      overflow: 'hidden',
      color: '#fff',
    }}>

      {/* ── Top row: agent identity | responds-within ─────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '18px 20px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>

          {/* Photo circle(s) */}
          {isDual ? (
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {allAgents.map((a, i) => (
                <div
                  key={i}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    marginLeft: i > 0 ? -10 : 0,
                    border: '2px solid var(--brand-bg)',
                    background: 'rgba(255,255,255,0.12)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: allAgents.length - i,
                    position: 'relative',
                  }}
                >
                  {a.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={a.photo} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
                  ) : (
                    <span style={{ fontSize: 16 }}>👤</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.18)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {photoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoSrc} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
              ) : (
                <span style={{ fontSize: 18 }}>👤</span>
              )}
            </div>
          )}

          {/* Name + subtitle */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
              {isDual ? 'Top Realtor Team' : 'Top Realtor'} · {cityName}
            </div>
            {!isDual && agent.brokerage && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 1 }}>
                {agent.brokerage}
              </div>
            )}
          </div>
        </div>

        {/* Responds */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          flexShrink: 0, fontSize: 11, color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: '#22c55e', flexShrink: 0,
          }} />
          Responds in {respondTimeLabel}
        </div>
      </div>

      {/* ── Body: market info (left) | CTAs (right) ───────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Left: market condition */}
        <div style={{
          padding: '18px 16px',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}>
          {badge ? (
            <>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 20,
                padding: '4px 11px 4px 7px',
                marginBottom: 10,
              }}>
                <PropIcon emoji={marketEmoji(widget?.market_type)} size={13} color="#fff" strokeWidth={2} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', textTransform: 'uppercase' }}>
                  {badge.label}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 6 }}>
                {cityName} is a {badge.label.replace(' Market', '')} — {marketTagline(widget?.market_type)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {buyers.toLocaleString()} registered buyers are searching this area
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
              Get the latest {cityName} market update from {firstName} — free, no commitment.
            </div>
          )}
        </div>

        {/* Right: CTAs */}
        <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href={ap('/contact?source=home-worth')} style={ctaBtnStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PropIcon emoji="🏡" size={14} color="#fff" strokeWidth={2} />
              What&apos;s my home worth?
            </span>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 500, opacity: 0.8, marginTop: 1 }}>
              Free, no-obligation eval
            </span>
          </a>
          <a href={ap('/contact?source=new-listings')} style={ctaBtnStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PropIcon emoji="🔔" size={14} color="#fff" strokeWidth={2} />
              Alert me of new listings
            </span>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 500, opacity: 0.75, marginTop: 1 }}>
              {widget?.active ? `${widget.active} active now` : 'Updated daily'}
            </span>
          </a>

          {/* Phone button(s) — one per agent for dual, single for solo */}
          {isDual
            ? allAgents.filter(a => a.phone).map((a, i) => (
                <a key={i} href={`tel:${a.phone}`} style={phoneBtnStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <PropIcon emoji="📞" size={13} color="#fff" strokeWidth={2} />
                    Call {a.name.split(' ')[0]}
                  </span>
                  <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                    {a.phone}
                  </span>
                </a>
              ))
            : agent.phone && (
                <a href={`tel:${agent.phone}`} style={phoneBtnStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <PropIcon emoji="📞" size={13} color="#fff" strokeWidth={2} />
                    Call {firstName}
                  </span>
                  <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                    {agent.phone}
                  </span>
                </a>
              )
          }
        </div>
      </div>

      {/* ── 4-stat bottom row ─────────────────────────────────────────── */}
      {widget && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { v: String(widget.active ?? '—'), l: 'Active' },
            { v: widget.avg_dom != null ? `${widget.avg_dom}d` : '—', l: 'Avg DOM' },
            { v: widget.avg_sold_price ? formatPriceFull(widget.avg_sold_price) : '—', l: 'Avg Sold' },
            { v: buyers.toLocaleString(), l: 'Buyers' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '10px 8px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
