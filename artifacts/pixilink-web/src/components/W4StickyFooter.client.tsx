'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import type { AgentProfile } from '@/lib/types'
import { imgUrl, getCoAgents } from '@/lib/types'
import W2HomeEvaluation from './W2HomeEvaluation.client'
import RequestShowingWidget from './RequestShowingWidget.client'
import { getListingData, subscribeListingData } from '@/lib/listing-store'

interface Props {
  agent: AgentProfile
  neighbourhood?: string
}

export default function W4StickyFooter({ agent, neighbourhood = 'your area' }: Props) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const headshotSrc = agent.headshot_path
    ? `/api/resize-img?src=${encodeURIComponent(agent.headshot_path)}&w=72`
    : null
  const photoSrc = headshotSrc || (agent.photo_path ? imgUrl(agent.photo_path, 400) : null)
  const firstName = agent.name.split(' ')[0]

  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const displayName = isDualAgent ? `${firstName} & ${coAgents[0].name.split(' ')[0]}` : agent.name
  const displayFirstNames = isDualAgent ? `${firstName} & ${coAgents[0].name.split(' ')[0]}` : firstName

  // Auto-detect page type from URL
  const isListingPage = /\/listing\//.test(pathname ?? '')
  const isSoldPage = /\/sold\/[^/]+$/.test(pathname ?? '')
  const isHomePage = pathname === '/' || /^\/agent\/[^/]+\/?$/.test(pathname ?? '')

  const mode = isListingPage ? 'showing' : 'valuation'

  const headline = isListingPage
    ? `Book a private tour with ${displayFirstNames}`
    : `Get a free home valuation`

  const sub = isListingPage
    ? `${displayFirstNames} ${isDualAgent ? 'are' : 'is'} your local specialist${isDualAgent ? 's' : ''} — no obligation`
    : `${neighbourhood} specialist${isDualAgent ? 's' : ''} · No obligation`

  const ctaLabel = isListingPage ? 'Request Showing' : 'Home Evaluation'
  const formType = isListingPage ? 'w1' : 'w2'
  const formBadge = isListingPage ? 'REQUEST SHOWING' : 'FREE HOME VALUATION'
  const formTitle = isListingPage
    ? `Book a showing with ${displayFirstNames}`
    : `What's your ${neighbourhood} home worth?`

  // Read real listing data published by the listing page (address, price, mlsNum).
  // useSyncExternalStore reads the snapshot synchronously on every render and subscribes
  // atomically, so it never misses a publication that fired before the subscription effect.
  const listingData = useSyncExternalStore(subscribeListingData, getListingData, () => null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  const handleSubmitted = useCallback(() => {
    setExpanded(false)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }, [])

  if (!visible || isHomePage || isSoldPage) return null

  return (
    <div className={isListingPage ? 'w4-root w4-listing' : 'w4-root'} style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
      background: 'var(--brand-bg)',
      borderTop: '3px solid var(--brand-accent)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.28)',
    }}>

      {/* ── Collapsed bar ── */}
      {!expanded && !submitted && (
        <div className="w4-bar">

          {/* Agent identity */}
          <div className="w4-identity">
            {isDualAgent ? (
              <div style={{ display: 'flex', flexShrink: 0 }}>
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={agent.name}
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '2px solid rgba(var(--brand-overlay-rgb),0.35)', flexShrink: 0, position: 'relative', zIndex: 2 }}
                  />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(var(--brand-overlay-rgb),0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: 'var(--brand-text)', flexShrink: 0, position: 'relative', zIndex: 2 }}>
                    {agent.name.charAt(0)}
                  </div>
                )}
                <img
                  src={imgUrl(coAgents[0].photo, 400)}
                  alt={coAgents[0].name}
                  style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 20%', border: '2px solid rgba(var(--brand-overlay-rgb),0.35)', flexShrink: 0, marginLeft: -13, position: 'relative', zIndex: 1 }}
                />
              </div>
            ) : photoSrc ? (
              <img
                src={photoSrc}
                alt={agent.name}
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 15%', border: '2px solid rgba(var(--brand-overlay-rgb),0.35)', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(var(--brand-overlay-rgb),0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: 'var(--brand-text)', flexShrink: 0 }}>
                {agent.name.charAt(0)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(var(--brand-overlay-rgb),0.65)', whiteSpace: 'nowrap' }}>
                {agent.brokerage}
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="w4-copy">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-text)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {headline}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(var(--brand-overlay-rgb),0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {sub}
            </div>
          </div>

          {/* CTAs */}
          <div className="w4-ctas">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="w4-phone-link"
                style={{ color: 'var(--brand-text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, border: '1px solid rgba(var(--brand-overlay-rgb),0.35)', borderRadius: 7, padding: '8px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                📞 <span className="w4-phone-num">{agent.phone}</span>
              </a>
            )}
            <button
              onClick={() => setExpanded(true)}
              style={{ background: '#fff', color: '#111', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── Thank-you state ── */}
      {submitted && !expanded && (
        <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--brand-text)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>✓</div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {mode === 'showing'
              ? `Got it! ${firstName} will confirm your showing shortly.`
              : `Got it! ${firstName} will be in touch within a few hours.`}
          </span>
        </div>
      )}

      {/* ── Expanded form panel ── */}
      {expanded && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
          background: '#fff', borderTop: '3px solid var(--brand-accent)',
          maxHeight: '92dvh', overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 16px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setExpanded(false)}
                style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', fontSize: 12, padding: '4px 12px', borderRadius: 5, cursor: 'pointer', fontWeight: 500 }}
              >
                ↓ Collapse
              </button>
            </div>
            {isListingPage ? (
              <RequestShowingWidget
                agent={agent}
                address={listingData?.address ?? ''}
                price={listingData?.price ?? ''}
                mlsNum={listingData?.mlsNum}
                coAgents={coAgents}
              />
            ) : (
              <W2HomeEvaluation
                agent={agent}
                neighbourhood={neighbourhood}
                onDone={handleSubmitted}
                formType={formType}
                formTitle={formTitle}
                formBadge={formBadge}
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        .w4-bar {
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .w4-identity {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
          max-width: 200px;
        }
        .w4-copy {
          flex: 1;
          min-width: 0;
        }
        .w4-ctas {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .w4-phone-num { display: inline; }

        @media (max-width: 900px) and (min-width: 601px) {
          .w4-identity { max-width: 160px; }
          .w4-phone-num { display: none; }
          .w4-phone-link { padding: 8px 10px !important; }
        }

        /* Listing pages: ListingMobileBar handles mobile — hide W4 there */
        @media (max-width: 900px) {
          .w4-listing { display: none !important; }
        }

        @media (max-width: 600px) {
          .w4-bar {
            padding: 10px 12px;
          }
          .w4-copy { display: none; }
          .w4-ctas a, .w4-ctas button {
            padding: 9px 12px !important;
            font-size: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .w4-phone-link { display: none !important; }
          .w4-ctas button {
            padding: 10px 16px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </div>
  )
}
