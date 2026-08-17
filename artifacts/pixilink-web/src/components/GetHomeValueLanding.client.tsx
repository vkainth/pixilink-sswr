'use client'

import { useEffect, useState } from 'react'
import type { AgentProfile } from '@/lib/types'
import { imgUrl } from '@/lib/types'
import W2HomeEvaluation from '@/components/W2HomeEvaluation.client'

interface Props {
  agent: AgentProfile
  trustLine: string
  statLine: string | null
  yearsExperience?: string | null
  blurb?: string | null
  credentials?: string[]
  soldCount?: number | null
  testimonial?: { name: string; text: string; rating: number } | null
}

const AD_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

function readAdParams(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const result: Record<string, string | undefined> = {}
  for (const key of AD_PARAMS) {
    const val = params.get(key)
    if (val) result[key] = val
  }
  return result
}

export default function GetHomeValueLanding({
  agent,
  trustLine,
  statLine,
  yearsExperience,
  blurb,
  credentials = [],
  soldCount,
  testimonial,
}: Props) {
  const [adParams, setAdParams] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    // Capture ad attribution on first load and persist it through the multi-step
    // form (session-scoped, so a refresh mid-form doesn't lose the source).
    const fromUrl = readAdParams()
    if (Object.keys(fromUrl).length > 0) {
      sessionStorage.setItem('pxl_ad_params', JSON.stringify(fromUrl))
      setAdParams(fromUrl)
    } else {
      try {
        const stored = sessionStorage.getItem('pxl_ad_params')
        if (stored) setAdParams(JSON.parse(stored))
      } catch {
        // ignore malformed storage
      }
    }
  }, [])

  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 325) : null

  function handleDone() {
    window.gtag?.('event', 'generate_lead', {
      form_type: 'home_evaluation_ppc',
      agent_slug: agent.slug,
    })
    window.fbq?.('track', 'Lead', { content_name: 'home_evaluation_ppc' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal header — logo/name + tap-to-call only, no site nav */}
      <div style={{ background: '#111', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {photoSrc ? (
            <img src={photoSrc} alt={agent.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#333', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {agent.name.charAt(0)}
            </div>
          )}
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{agent.name}</div>
        </div>
        <a
          href={`tel:${agent.phone}`}
          style={{ color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 12px' }}
        >
          📞 Call {agent.phone}
        </a>
      </div>

      <div style={{ flex: 1, maxWidth: 480, width: '100%', margin: '0 auto', padding: '28px 16px 40px' }}>
        <h1 style={{ fontSize: 'clamp(24px,6vw,32px)', fontWeight: 800, lineHeight: 1.15, color: '#111', textAlign: 'center', margin: '0 0 10px' }}>
          What Is Your Home Worth Today?
        </h1>
        <p style={{ fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 1.6, margin: '0 0 18px' }}>
          Get a free, no-obligation Comparative Market Analysis — based on real recent sold prices, not an automated estimate.
        </p>

        {/* Credibility card — who's behind the estimate, so visitors aren't handing
            info to an anonymous form. Sourced from real agent data only. */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 18px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: blurb ? 10 : 0 }}>
            {photoSrc ? (
              <img src={photoSrc} alt={agent.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                {agent.name.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{agent.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {agent.brokerage}
                {yearsExperience ? ` · ${yearsExperience} yrs experience` : ''}
                {agent.license_number ? ` · Lic. ${agent.license_number}` : ''}
              </div>
            </div>
          </div>

          {blurb && (
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.55, margin: '10px 0 0' }}>{blurb}</p>
          )}

          {credentials.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {credentials.map((c, i) => (
                <div
                  key={i}
                  style={{ fontSize: 11, fontWeight: 600, color: '#111', background: '#f4f1ea', border: '1px solid #e5decd', borderRadius: 20, padding: '4px 10px' }}
                >
                  🏆 {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {trustLine && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>
              {trustLine}
            </div>
            {(statLine || soldCount) && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {soldCount ? `${soldCount.toLocaleString()}+ homes sold locally` : ''}
                {soldCount && statLine ? ' · ' : ''}
                {statLine || ''}
              </div>
            )}
          </div>
        )}

        {testimonial && (
          <div style={{ background: '#fffdf5', border: '1px solid #f0e6c8', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ color: '#eab308', fontSize: 13, marginBottom: 6 }}>{'★'.repeat(Math.min(5, Math.max(1, testimonial.rating)))}</div>
            <p style={{ fontSize: 13, color: '#333', lineHeight: 1.55, margin: '0 0 6px', fontStyle: 'italic' }}>&ldquo;{testimonial.text}&rdquo;</p>
            <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>— {testimonial.name}</div>
          </div>
        )}

        <W2HomeEvaluation
          agent={agent}
          formType="home_evaluation_ppc"
          formTitle="What's Your Home Worth?"
          formBadge="FREE VALUATION"
          onDone={handleDone}
          extraFields={{
            landing_page: 'get-home-value',
            ...adParams,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 22, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>✓ Real MLS® data</div>
          <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>✓ No obligation</div>
          <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>✓ Results in 24–48 hours</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '14px 16px', fontSize: 11, color: '#999' }}>
        {agent.name} · {agent.brokerage}
        {agent.license_number ? ` · Lic. ${agent.license_number}` : ''}
      </div>
    </div>
  )
}
