'use client'
import { useState, useEffect } from 'react'

export default function ResidencityNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 'var(--nav-height)',
        background: '#0d1729',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px,4vw,48px)',
        justifyContent: 'space-between',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.35)' : '0 1px 0 rgba(255,255,255,0.07)',
        transition: 'box-shadow 0.2s',
      }}>
        <a href="/residencity" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/residencity-logo.png" alt="Residencity" height={38}
            style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
        </a>

        <div style={{ display: 'flex', gap: 28, fontSize: 13, fontWeight: 500 }} className="nav-links-desktop">
          {[
            { label: 'Heatmap', href: '/residencity#heatmap' },
            { label: 'Market Stats', href: '/residencity#area-search' },
            { label: 'Area Search', href: '/residencity#area-search' },
            { label: 'Zones', href: '/residencity#zones' },
          ].map(link => (
            <a key={link.href} href={link.href}
              style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="mailto:info@residencity.ca"
            className="nav-phone-desktop"
            style={{
              fontSize: 13, fontWeight: 700, color: '#14213d',
              background: '#c9a84c', borderRadius: 8,
              padding: '8px 18px', textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Claim a Zone
          </a>
          <button onClick={() => setMenuOpen(v => !v)}
            className="nav-hamburger"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'none' }}
            aria-label="Toggle menu">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              {menuOpen
                ? <path d="M4 4l14 14M18 4L4 18" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
                : <>
                    <line x1="3" y1="6" x2="19" y2="6" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="11" x2="19" y2="11" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="16" x2="19" y2="16" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
                  </>
              }
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, bottom: 0,
          background: '#0d1729', zIndex: 199, padding: '32px clamp(16px,4vw,48px)',
          display: 'flex', flexDirection: 'column', gap: 24,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {[
            { label: 'Heatmap', href: '/residencity#heatmap' },
            { label: 'Market Stats', href: '/residencity#area-search' },
            { label: 'Area Search', href: '/residencity#area-search' },
            { label: 'Zones', href: '/residencity#zones' },
          ].map(link => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              style={{ fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
              {link.label}
            </a>
          ))}
          <a href="mailto:info@residencity.ca"
            style={{ fontSize: 20, fontWeight: 700, color: '#c9a84c', textDecoration: 'none' }}>
            Claim a Zone →
          </a>
        </div>
      )}
    </>
  )
}
