'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { AgentProfile, AuthUser } from '@/lib/types'
import { imgUrl, getHeroCredentials, getCoAgents, resolveSiteConfig } from '@/lib/types'
import { authFetch } from '@/lib/auth-client'
import { useAgentPrefix } from '@/lib/agent-context'

const BASE_NAV_LINKS = [
  { label: 'Houses',        href: 'houses-for-sale',     flag: null },
  { label: 'Apartments',    href: 'condos-for-sale',     flag: null },
  { label: 'Townhouses',    href: 'townhouses-for-sale', flag: null },
  { label: 'New Homes',     href: 'new-construction',    flag: null },
  { label: 'Featured',      href: 'my-listings',         flag: null },
  { label: 'Buildings',     href: 'buildings',           flag: null },
  { label: 'Neighbourhood', href: 'neighbourhoods',      flag: null },
  { label: 'Market',        href: 'market',              flag: null },
  { label: 'Buyers',        href: 'buyers',              flag: null },
  { label: 'Sellers',       href: 'sellers',             flag: null },
  { label: 'About',         href: 'about',               flag: null },
]

const SHOWCASE_NAV_LINKS = [
  { label: 'About',            href: 'about',            flag: null },
  { label: 'Sell With Me',     href: 'sell-with-me',     flag: null },
  { label: 'Properties',       href: 'featured-properties', flag: null },
  { label: 'Home Evaluation',  href: 'home-evaluation',     flag: null },
  { label: 'Contact',          href: 'contact',             flag: null },
  { label: 'Search',           href: 'search',              flag: null },
]

type NavStyle = 'centered' | 'dark-bar' | 'transparent-hero' | 'minimal'

interface Props {
  agent: AgentProfile
  user?: AuthUser | null
  navStyle?: NavStyle
}

export default function AgentNav({ agent, user, navStyle = 'dark-bar' }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen]     = useState(false)
  const [userOpen, setUserOpen]     = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const cfg = resolveSiteConfig(agent)
  const isShowcase = cfg.layout_preset === 'showcase'

  const headshotSrc = agent.headshot_path
    ? `/api/resize-img?src=${encodeURIComponent(agent.headshot_path)}&w=72`
    : null
  const photoSrc = headshotSrc || (agent.photo_path ? imgUrl(agent.photo_path, 400) : null)
  const photoPosition = '50% 20%'
  const guideName = agent.settings?.guide_name?.trim() || null
  const topCredential = getHeroCredentials(agent)[0] || null
  const coAgents = getCoAgents(agent)
  const isDualAgent = coAgents.length > 0
  const displayName = isDualAgent ? `${agent.name.split(' ')[0]} & ${coAgents[0].name.split(' ')[0]}` : agent.name
  const navSubtitle = topCredential ? `${displayName} · ${topCredential}` : `Powered by ${displayName}`
  const agentPrefix = useAgentPrefix()
  const signInUrl = agentPrefix + '/sign-in'

  const hasTeam = Array.isArray(agent.settings?.team_members) && (agent.settings?.team_members?.length ?? 0) > 0

  const NAV_LINKS = isShowcase
    ? SHOWCASE_NAV_LINKS
    : BASE_NAV_LINKS.filter(link => {
        if ((link as { teamOnly?: boolean }).teamOnly) return hasTeam
        if (!link.flag) return true
        return agent.features?.[link.flag] === true
      })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    if (!userOpen) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userOpen])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await authFetch('/api/auth/logout', { method: 'POST' })
    } catch { /* ignore */ }
    window.location.reload()
  }

  const pathname = usePathname()
  const ap = (p: string) => agentPrefix + p
  const isActive = (href: string) => pathname?.includes(`/${href}`) ?? false

  const isDarkNav = navStyle === 'dark-bar'
  const isTransparent = navStyle === 'transparent-hero'
  const isMinimal = navStyle === 'minimal'
  const isCentered = navStyle === 'centered' && !isShowcase

  const navBg =
    isShowcase ? 'var(--site-dark)'
    : isDarkNav ? 'var(--primary-bg)'
    : isTransparent ? (scrolled ? 'rgba(255,255,255,0.97)' : 'transparent')
    : '#fff'

  const navShadow =
    isShowcase ? '0 1px 0 rgba(155,139,122,0.15)'
    : isDarkNav ? '0 1px 0 rgba(255,255,255,0.10)'
    : isTransparent && !scrolled ? 'none'
    : scrolled ? '0 2px 8px rgba(0,0,0,0.10)' : '0 1px 0 #e5e7eb'

  const isLightText = isShowcase || isDarkNav || (isTransparent && !scrolled)
  const navTextColor      = isLightText ? '#fff' : '#111'
  const navSubTextColor   = isLightText ? 'rgba(255,255,255,0.65)' : '#6b7280'
  const navLinkColor      = isShowcase ? 'rgba(255,255,255,0.65)' : isLightText ? 'rgba(255,255,255,0.70)' : '#6b7280'
  const navLinkActiveColor = isShowcase ? 'var(--site-accent)' : isLightText ? '#fff' : '#111'
  const navActiveBorder   = isShowcase ? 'var(--site-accent)' : isDarkNav ? 'var(--brand-accent)' : isTransparent && !scrolled ? '#fff' : '#111'
  const photoRingColor    = isShowcase ? 'var(--site-accent)' : isDarkNav ? 'var(--brand-accent)' : '#e5e7eb'
  const hamburgerColor    = isLightText ? '#fff' : '#111'
  const mobileDrawerBg    = isShowcase ? 'var(--site-dark)' : isDarkNav ? 'var(--primary-bg)' : '#fff'
  const mobileDrawerBorder = isShowcase || isDarkNav ? 'rgba(255,255,255,0.10)' : '#e5e7eb'
  const mobileLinkColor   = isShowcase ? 'rgba(255,255,255,0.75)' : isDarkNav ? 'rgba(255,255,255,0.80)' : '#374151'
  const mobileLinkActive  = isShowcase ? 'var(--site-accent)' : isDarkNav ? '#fff' : '#111'
  const mobileLinkActiveBg = isShowcase || isDarkNav ? 'rgba(255,255,255,0.08)' : '#f9fafb'

  // Split links for centered variant: roughly half on each side
  const midpoint = Math.ceil(NAV_LINKS.length / 2)
  const linksLeft  = isCentered ? NAV_LINKS.slice(0, midpoint) : NAV_LINKS
  const linksRight = isCentered ? NAV_LINKS.slice(midpoint) : []

  function NavLink({ link }: { link: typeof NAV_LINKS[0] }) {
    const active = isActive(link.href)
    return (
      <li key={link.href}>
        <a href={ap(`/${link.href}`)}
          style={{
            color: active ? navLinkActiveColor : navLinkColor,
            textDecoration: 'none',
            transition: 'color 0.15s',
            borderBottom: active ? `2px solid ${navActiveBorder}` : '2px solid transparent',
            paddingBottom: 2,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = navLinkActiveColor)}
          onMouseLeave={e => (e.currentTarget.style.color = active ? navLinkActiveColor : navLinkColor)}>
          {link.label}
        </a>
      </li>
    )
  }

  function Brand({ gridColumn }: { gridColumn?: number }) {
    const justifySelf: React.CSSProperties['justifySelf'] =
      isCentered ? 'center'
      : 'start'
    return (
      <a href={ap('/')} style={{ gridColumn, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0, justifySelf, overflow: 'hidden' }}>
        {isDualAgent ? (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {photoSrc ? (
              <img src={photoSrc} alt={agent.name} width={36} height={36}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: photoPosition, border: `2px solid ${photoRingColor}`, boxShadow: '0 0 0 1.5px rgba(0,0,0,0.05)', flexShrink: 0, position: 'relative', zIndex: 2 }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0, border: `2px solid ${photoRingColor}`, position: 'relative', zIndex: 2 }}>
                {agent.name.charAt(0)}
              </div>
            )}
            <img src={imgUrl(coAgents[0].photo, 400)} alt={coAgents[0].name} width={36} height={36}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 20%', border: `2px solid ${photoRingColor}`, flexShrink: 0, marginLeft: -12, position: 'relative', zIndex: 1 }} />
          </div>
        ) : photoSrc ? (
          <img src={photoSrc} alt={agent.name} width={36} height={36}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: photoPosition, border: `2px solid ${photoRingColor}`, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0 }}>
            {agent.name.charAt(0)}
          </div>
        )}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          {guideName ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, color: navTextColor, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {guideName}
              </div>
              <div style={{ fontSize: 11, color: navSubTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {navSubtitle}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 13, color: navTextColor, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: navSubTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {agent.brokerage}
              </div>
            </>
          )}
        </div>
      </a>
    )
  }

  function SignInBtn() {
    if (user) {
      return (
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={userOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f3f4f6', border: 'none', borderRadius: 22, padding: '5px 12px 5px 5px', cursor: 'pointer', color: '#111' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>
              {user.initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.first_name || user.name}
            </span>
            <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
          </button>
          {userOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: '#fff', borderRadius: 10, padding: '8px 0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 180, zIndex: 300,
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{user.email}</div>
              </div>
              <a href={ap('/saved')} onClick={() => setUserOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                Saved Homes
              </a>
              <button onClick={handleLogout} disabled={loggingOut}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 16px', fontSize: 13, color: loggingOut ? '#aaa' : '#c0392b', cursor: loggingOut ? 'default' : 'pointer', fontWeight: 500 }}>
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      )
    }
    return (
      <a href={signInUrl}
        className="nav-signin-desktop"
        style={{
          background: 'transparent', color: navTextColor, padding: '8px 18px', borderRadius: 6,
          fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap',
          border: isDarkNav ? '1px solid rgba(255,255,255,0.35)' : '1px solid #d1d5db',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = isDarkNav ? 'rgba(255,255,255,0.70)' : '#9ca3af'; e.currentTarget.style.color = navLinkActiveColor }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = isDarkNav ? 'rgba(255,255,255,0.35)' : '#d1d5db'; e.currentTarget.style.color = navTextColor }}>
        Sign In
      </a>
    )
  }

  // Minimal nav: hamburger is always visible (desktop + mobile) — it's the only navigation control.
  // Other variants: hamburger is CSS-hidden on desktop (display:none), shown at ≤1050px.
  const Hamburger = () => (
    <button onClick={() => setMenuOpen(v => !v)}
      aria-label="Menu"
      style={{ display: isMinimal ? 'flex' : 'none', background: 'none', border: 'none', color: hamburgerColor, fontSize: 22, padding: 4, cursor: 'pointer', lineHeight: 1, alignItems: 'center' }}
      className={isMinimal ? undefined : 'nav-hamburger'}>
      {menuOpen ? '✕' : '☰'}
    </button>
  )

  return (
    <>
      <nav aria-label="Main navigation" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 'var(--nav-height)',
        background: navBg,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: 12,
        padding: '0 clamp(16px,4vw,48px)',
        boxShadow: navShadow,
        transition: 'background 0.2s, box-shadow 0.2s',
      }}>

        {isCentered ? (
          <>
            {/* Centered variant: left links | brand | right links + sign-in */}
            <ul style={{ gridColumn: 1, display: 'flex', gap: 20, listStyle: 'none', margin: 0, padding: 0, justifySelf: 'start', alignItems: 'center' }}
              className="nav-links-desktop">
              {linksLeft.map(link => <NavLink key={link.href} link={link} />)}
            </ul>
            <Brand gridColumn={2} />
            <div style={{ gridColumn: 3, display: 'flex', alignItems: 'center', gap: 16, justifySelf: 'end', flexShrink: 0 }}>
              <ul style={{ display: 'flex', gap: 20, listStyle: 'none', margin: 0, padding: 0 }}
                className="nav-links-desktop">
                {linksRight.map(link => <NavLink key={link.href} link={link} />)}
              </ul>
              <span className="nav-signin-desktop"><SignInBtn /></span>
              <Hamburger />
            </div>
          </>
        ) : isMinimal ? (
          <>
            {/* Minimal variant: brand left | nothing | hamburger only (no sign-in on desktop) */}
            <Brand gridColumn={1} />
            <div style={{ gridColumn: 2 }} />
            <div style={{ gridColumn: 3, display: 'flex', alignItems: 'center', justifySelf: 'end' }}>
              <Hamburger />
            </div>
          </>
        ) : (
          <>
            {/* dark-bar / transparent-hero: brand left | all links centered | sign-in right */}
            <Brand gridColumn={1} />
            <ul style={{ gridColumn: 2, display: 'flex', gap: 24, fontSize: 13, fontWeight: 500, justifySelf: 'center', whiteSpace: 'nowrap', listStyle: 'none', margin: 0, padding: 0 }}
              className="nav-links-desktop">
              {linksLeft.map(link => <NavLink key={link.href} link={link} />)}
            </ul>
            <div style={{ gridColumn: 3, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, justifySelf: 'end' }}>
              <span className="nav-signin-desktop"><SignInBtn /></span>
              <Hamburger />
            </div>
          </>
        )}

      </nav>

      {/* Mobile drawer backdrop */}
      {menuOpen && (
        <div
          role="presentation"
          onClick={() => setMenuOpen(false)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setMenuOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(0,0,0,0.35)' }} />
      )}

      {/* Mobile drawer — always shows sign-in regardless of navStyle */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal={true}
          aria-label="Navigation menu"
          style={{
            position: 'fixed', top: 'var(--nav-height)', left: 0, right: 0, zIndex: 199,
            maxHeight: 'calc(100dvh - var(--nav-height))',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch' as never,
            background: mobileDrawerBg, borderTop: `1px solid ${mobileDrawerBorder}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
          }}>
          <div style={{ padding: '16px 24px', borderBottom: `2px solid ${mobileDrawerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            {user ? (
              <button onClick={handleLogout} disabled={loggingOut}
                style={{ background: 'none', border: `1px solid ${mobileDrawerBorder}`, borderRadius: 6, padding: '8px 14px', color: loggingOut ? '#aaa' : '#c0392b', fontSize: 13, fontWeight: 600, cursor: loggingOut ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            ) : (
              <a href={signInUrl}
                style={{ background: isDarkNav ? 'var(--brand-accent)' : '#111', color: '#fff', padding: '9px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Sign In
              </a>
            )}
          </div>

          <div style={{ padding: '8px 0' }}>
            {NAV_LINKS.map(link => {
              const active = isActive(link.href)
              return (
                <a key={link.href} href={ap(`/${link.href}`)}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    color: active ? mobileLinkActive : mobileLinkColor,
                    fontSize: 16,
                    fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                    padding: '14px 24px',
                    borderLeft: active ? `3px solid ${navActiveBorder}` : '3px solid transparent',
                    background: active ? mobileLinkActiveBg : 'transparent',
                  }}>
                  {link.label}
                </a>
              )
            })}

            {user && (
              <a href={ap('/saved')}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: mobileLinkColor, fontSize: 16, fontWeight: 500, textDecoration: 'none', padding: '14px 24px', borderLeft: '3px solid transparent' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                Saved Homes
              </a>
            )}
          </div>

          {user && (
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${mobileDrawerBorder}`, fontSize: 12, color: isDarkNav ? 'rgba(255,255,255,0.45)' : '#9ca3af' }}>
              Signed in as {user.name || user.email}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 1050px) {
          .nav-links-desktop { display: none !important; }
          .nav-signin-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
