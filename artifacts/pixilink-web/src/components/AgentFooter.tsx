'use client'

import { playfair } from '@/lib/fonts'
import type { AgentProfile, AgentTerritory, LandingPage, NeighbourhoodSummary } from '@/lib/types'
import { imgUrl, getCoAgents, resolveSiteConfig } from '@/lib/types'
import { useAgentPrefix } from '@/lib/agent-context'
import { usePathname } from 'next/navigation'
import { toSubareaSlug, subareaDisplayName } from '@/app/agent/[slug]/homes-for-sale/subareaUtils'
import { PERSONAS } from '@/lib/personas'


interface Props {
  agent: AgentProfile
  territories: AgentTerritory[]
  landingPages?: LandingPage[]
  neighbourhoods?: NeighbourhoodSummary[]
}

// Which agents each slug-gated page actually exists for. These MUST stay in step with
// the notFound() gates inside the routes themselves — app/agent/[slug]/new-construction
// (randy + tricity + burnaby) and /luxury-homes + /ocean-view-homes (randy only).
// The footer previously linked all of them for everyone, so every other agent's footer
// advertised pages that 404 on their own site.
const NEW_CONSTRUCTION_SLUGS = new Set(['randy', 'tricity', 'saeed-farhani-ppqu'])
const RANDY_ONLY_SLUG = 'randy'

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Builds the "Listings by Area" link list from agent territories.
 * Returns null when no territories have a subarea (skip the column entirely).
 * Caps at 12 links (top 6 subareas × 2 links each: Condos + Houses).
 * Links are ordered in pairs: [Condos0, Houses0, Condos1, Houses1, ...]
 * so a 2-column grid naturally places Condos left and Houses right per row.
 */
function buildSubareaListingLinks(
  territories: AgentTerritory[],
): { label: string; href: string }[] | null {
  const withSubarea = territories.filter(t => t.subarea)
  if (withSubarea.length === 0) return null

  const seenSub = new Set<string>()
  const uniqueSubareas = withSubarea.filter(t => {
    const key = t.subarea!.toLowerCase()
    if (seenSub.has(key)) return false
    seenSub.add(key)
    return true
  })

  const uniqueCities = [...new Set(uniqueSubareas.map(t => t.city))]
  const multiCity = uniqueCities.length > 1

  const ordered = multiCity
    ? uniqueCities.flatMap(city => uniqueSubareas.filter(t => t.city === city))
    : uniqueSubareas

  const top6 = ordered.slice(0, 6)

  const links: { label: string; href: string }[] = []
  for (const t of top6) {
    const subarea = t.subarea!
    const display = subareaDisplayName(subarea) || subarea
    const slug = toSubareaSlug(subarea)
    const param = encodeURIComponent(slug)
    links.push({ label: `${display} Condos for Sale`,  href: `/condos-for-sale?subarea=${param}` })
    links.push({ label: `${display} Houses for Sale`, href: `/houses-for-sale?subarea=${param}` })
  }

  return links.length > 0 ? links : null
}

interface FooterLinkGroups {
  utility: Record<string, { label: string; href: string }[]>
  area: Record<string, { label: string; href: string }[]>
}

/**
 * Returns footer links split into two groups:
 * - utility: Search, Market, Resources (row 1)
 * - area: Listings by Area, Neighbourhoods, Top Realtor (row 2)
 */
function buildFooterLinks(
  agent: AgentProfile,
  territories: AgentTerritory[],
  landingPages: LandingPage[],
  neighbourhoods: NeighbourhoodSummary[],
): FooterLinkGroups {
  const firstName = agent.name.split(' ')[0]
  const guideName = agent.settings?.guide_name?.trim() || 'Neighbourhood Guides'

  const seen = new Set<string>()
  const uniqueAreas = territories
    .map(t => t.subarea || t.city)
    .filter(name => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // Only link neighbourhoods that actually exist, matching territory names against the
  // real slugs from /neighbourhoods — the same rule the Top Realtor block below already
  // follows, and for the same reason. Guessing the slug from the territory name emitted
  // /neighbourhood/surrey (404: "Surrey" is a city, not a neighbourhood). Note the fix is
  // NOT "only use subareas": White Rock is a city in Randy's territories and
  // /neighbourhood/white-rock is a real page, so filtering by subarea would have thrown
  // away a working link. Existence is the only reliable test. If the neighbourhood list
  // is unavailable we emit fewer links rather than guessing — degrade, never 404.
  const realNeighbourhoods = new Map(neighbourhoods.map(n => [n.slug, n]))
  const neighbourhoodAreaLinks: { label: string; href: string }[] = []
  for (const name of uniqueAreas) {
    if (neighbourhoodAreaLinks.length >= 6) break
    const match = [toSlug(name), toSubareaSlug(name)].find(s => realNeighbourhoods.has(s))
    if (!match) continue
    neighbourhoodAreaLinks.push({ label: name, href: `/neighbourhood/${match}` })
  }

  const neighbourhoodLinks: { label: string; href: string }[] = [
    { label: 'All Neighbourhoods', href: '/neighbourhoods' },
    { label: guideName, href: '/guide' },
    ...neighbourhoodAreaLinks,
  ]
  if (agent.slug === 'randy') {
    neighbourhoodLinks.push({ label: 'White Rock Lifestyle & Landmarks', href: '/white-rock' })
  }

  // Only link to Top Realtor pages that actually exist in the DB — matching by
  // canonical slug against real city_slug/area_slug values, not by guessing a
  // slug from the raw territory name (e.g. toSlug("Ocean Park Surrey") produces
  // "ocean-park-surrey", but the real area_slug is "ocean-park" — a naive guess 404s).
  const seenTopRealtor = new Set<string>()
  const topRealtorLinks: { label: string; href: string }[] = []
  for (const t of territories) {
    const name = t.subarea || t.city
    const key = name.toLowerCase()
    if (seenTopRealtor.has(key)) continue

    const candidateSlugs = new Set([toSlug(name), toSubareaSlug(name)])
    const match = t.subarea
      ? landingPages.find(p => p.area_slug && candidateSlugs.has(p.area_slug))
      : landingPages.find(p => !p.area_slug && candidateSlugs.has(p.city_slug))
    if (!match) continue

    seenTopRealtor.add(key)
    topRealtorLinks.push({
      label: `Top Realtor in ${name}`,
      href: match.area_slug ? `/top-realtor/${match.city_slug}/${match.area_slug}` : `/top-realtor/${match.city_slug}`,
    })
  }

  const subareaListingLinks = buildSubareaListingLinks(territories)

  return {
    utility: {
      'Search': [
        { label: 'All Homes for Sale', href: '/homes-for-sale' },
        // Slug-gated pages: these routes notFound() for anyone they were not written
        // for, so linking them unconditionally put dead links in the footer of every
        // other site — suburbia.ca was advertising Randy's /luxury-homes and
        // /ocean-view-homes. Keep these predicates in step with the gates in the
        // routes themselves (new-construction allows randy + tricity + burnaby).
        ...(NEW_CONSTRUCTION_SLUGS.has(agent.slug) ? [{ label: 'New Construction', href: '/new-construction' }] : []),
        { label: 'Condos for Sale', href: '/condos-for-sale' },
        // /townhomes-for-sale 308s to /townhouses-for-sale; link the canonical directly.
        { label: 'Townhomes for Sale', href: '/townhouses-for-sale' },
        ...(agent.slug === RANDY_ONLY_SLUG ? [
          { label: 'Luxury Homes', href: '/luxury-homes' },
          { label: 'Ocean View Homes', href: '/ocean-view-homes' },
        ] : []),
        { label: 'Open Houses', href: '/open-houses' },
        ...Object.values(PERSONAS).map(p => ({ label: p.label, href: `/persona/${p.slug}` })),
      ],
      'Market': [
        { label: 'Market Stats & Reports', href: '/market' },
        { label: 'Monthly Archive', href: '/market/archive' },  // canonical: ?tab=archive 301s here
        { label: 'Condo Buildings', href: '/buildings' },
        { label: 'Sold Homes', href: '/sold' },
        { label: 'My Listings', href: '/my-listings' },
      ],
      'Resources': [
        { label: `About ${firstName}`, href: '/about' },
        { label: 'Buyers Guide', href: '/buyers' },
        { label: 'Sellers Guide', href: '/sellers' },
        { label: guideName, href: '/guide' },
        { label: 'Free Home Valuation', href: '/home-evaluation' },
        { label: 'Client Reviews', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    area: {
      ...(subareaListingLinks ? { 'Listings by Area': subareaListingLinks } : {}),
      'Neighbourhoods': neighbourhoodLinks,
      ...(topRealtorLinks.length > 0 ? { 'Top Realtor': topRealtorLinks } : {}),
    },
  }
}

function LinkItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      title={label}
      style={{
        fontSize: 13,
        color: '#555',
        textDecoration: 'none',
        transition: 'color 0.15s',
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
    >
      {label}
    </a>
  )
}

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#4b5563',
      marginBottom: 20,
      paddingBottom: 10,
      borderBottom: '1px solid #e2ddd6',
    }}>
      {children}
    </div>
  )
}

export default function AgentFooter({ agent, territories, landingPages = [], neighbourhoods = [] }: Props) {
  const agentPrefix = useAgentPrefix()
  const ap = (p: string) => agentPrefix + p
  const pathname = usePathname()
  const isContactPage = pathname?.endsWith('/contact') ?? false
  const photoSrc = agent.photo_path ? imgUrl(agent.photo_path, 400) : null
  const coAgents = getCoAgents(agent)
  const year = new Date().getFullYear()

  const cfg = resolveSiteConfig(agent)
  const isShowcase = cfg.layout_preset === 'showcase'

  // ── Showcase footer (Modern Luxury) ────────────────────────────────────────
  if (isShowcase) {
    const SC_CHARCOAL  = 'var(--site-ink)'
    const SC_GOLD      = 'var(--site-accent)'
    const SC_OFF_WHITE = 'var(--site-canvas)'
    const firstName = agent.name.split(' ')[0]
    const scFirstName = firstName
    const showcaseLinks = [
      { label: `About ${firstName}`, href: '/about' },
      { label: 'Sell With Me',       href: '/sell-with-me' },
      { label: 'Properties',         href: '/featured-properties' },
      { label: 'Home Evaluation',    href: '/home-evaluation' },
      { label: 'Search Homes',       href: '/search' },
      { label: 'Contact',            href: '/contact' },
    ]
    const sl = agent.settings?.social_links
    const socials = [
      sl?.instagram ? { href: sl.instagram, label: 'Instagram', svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> } : null,
      sl?.facebook  ? { href: sl.facebook,  label: 'Facebook',  svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg> } : null,
      sl?.linkedin  ? { href: sl.linkedin,  label: 'LinkedIn',  svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> } : null,
    ].filter(Boolean)

    return (
      <footer style={{ fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 'var(--sticky-footer-height)' }}>
        {/* CTA Band */}
        <div style={{ background: SC_CHARCOAL, padding: '72px var(--container-padding)', borderTop: '1px solid rgba(155,139,122,0.2)' }}>
          <div className="container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
            <div style={{ flex: '1 1 340px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: SC_GOLD, marginBottom: 14 }}>
                {agent.brokerage}
              </p>
              <h2 style={{ fontFamily: "var(--font-display),Georgia,serif", fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: 14 }}>
                Let&rsquo;s find your<br />next home.
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.60)', lineHeight: 1.7, maxWidth: 380 }}>
                Expert guidance, honest advice, and a track record you can trust — from first showing to closing day.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '0 0 auto' }}>
              {isContactPage && agent.phone ? (
                <a href={`tel:${agent.phone}`} style={{ display: 'inline-block', padding: '13px 30px', background: SC_GOLD, color: SC_CHARCOAL, fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Call {scFirstName}
                </a>
              ) : (
                <a href={ap('/search')} style={{ display: 'inline-block', padding: '13px 30px', background: SC_GOLD, color: SC_CHARCOAL, fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Browse Homes
                </a>
              )}
              <a href={ap('/home-evaluation')} style={{ display: 'inline-block', padding: '12px 30px', background: 'transparent', color: SC_GOLD, fontSize: 13, fontWeight: 500, textDecoration: 'none', letterSpacing: '0.04em', border: `1px solid rgba(155,139,122,0.4)` }}>
                Free Home Evaluation
              </a>
            </div>
          </div>
        </div>

        {/* Links + Agent Card */}
        <div style={{ background: SC_OFF_WHITE, borderTop: '1px solid #e5e0d8', padding: '56px var(--container-padding) 40px' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 48px', alignItems: 'start' }} className="sc-footer-grid">
              {/* Agent card */}
              <div style={{ paddingRight: 48, borderRight: '1px solid #e2ddd6' }}>
                {photoSrc && (
                  <img src={photoSrc} alt={agent.name} width={72} height={72} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 20}%`, marginBottom: 14, border: `2px solid ${SC_GOLD}` }} />
                )}
                <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15, marginBottom: 2 }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>{agent.brokerage}</div>
                {agent.phone && (
                  <a href={`tel:${agent.phone}`} style={{ display: 'block', color: '#444', fontSize: 14, marginBottom: 5, textDecoration: 'none', fontWeight: 500 }}>{agent.phone}</a>
                )}
                {agent.email && (
                  <a href={`mailto:${agent.email}`} style={{ display: 'block', color: '#6b7280', fontSize: 12, textDecoration: 'none' }}>{agent.email}</a>
                )}
                {socials.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    {socials.map((s, i) => (
                      <a key={i} href={s!.href} target="_blank" rel="noopener noreferrer" aria-label={s!.label}
                        style={{ color: 'var(--site-accent)', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = SC_CHARCOAL)}
                        onMouseLeave={e => (e.currentTarget.style.color = SC_GOLD)}>
                        {s!.svg}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Page links */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4b5563', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #e2ddd6' }}>
                  Pages
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {showcaseLinks.map(link => (
                    <li key={link.href}>
                      <a href={ap(link.href)} style={{ fontSize: 13, color: '#555', textDecoration: 'none', display: 'block' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact CTA */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4b5563', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #e2ddd6' }}>
                  Get in Touch
                </div>
                <a href={ap('/contact')} style={{ display: 'inline-block', padding: '10px 20px', background: SC_CHARCOAL, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Contact {firstName}
                </a>
                <br />
                <a href={ap('/home-evaluation')} style={{ display: 'inline-block', padding: '9px 20px', background: 'transparent', color: SC_CHARCOAL, fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '1px solid #ccc' }}>
                  Free Home Evaluation
                </a>
              </div>
            </div>

            {/* Copyright */}
            <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e2ddd6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>© {year} {agent.name} · {agent.brokerage}</p>
              <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>MLS® data provided for informational purposes. E.&amp;O.E.</p>
              <div style={{ display: 'flex', gap: 16 }}>
                {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }].map(l => (
                  <a key={l.href} href={ap(l.href)} style={{ fontSize: 11, color: '#666', textDecoration: 'none' }}>{l.label}</a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .sc-footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
            .sc-footer-grid > div:first-child { padding-right: 0 !important; border-right: none !important; border-bottom: 1px solid #e2ddd6; padding-bottom: 24px; }
          }
        `}</style>
      </footer>
    )
  }

  const { utility: utilityLinks, area: areaLinks } = buildFooterLinks(agent, territories, landingPages, neighbourhoods)

  const utilityEntries = Object.entries(utilityLinks)
  const areaEntries = Object.entries(areaLinks)
  // Give "Listings by Area" double width so its inner 2-col grid has room for long labels
  const areaGridTemplate = areaEntries
    .map(([h]) => h === 'Listings by Area' ? '2fr' : '1fr')
    .join(' ')

  return (
    <footer style={{ fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 'var(--sticky-footer-height)' }}>

      {/* ── CTA Band ── */}
      <div style={{ background: 'var(--primary-bg)', padding: '80px var(--container-padding)' }}>
        <div className="container" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 40,
        }}>
          <div style={{ flex: '1 1 340px' }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 16,
            }}>
              {agent.brokerage}
            </p>
            <h2 className={playfair.className} style={{
              fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
              fontWeight: 400,
              color: '#fff',
              lineHeight: 1.2,
              marginBottom: 16,
            }}>
              Let&rsquo;s find your<br />next home.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, maxWidth: 380 }}>
              Local expertise, honest guidance, and a track record you can trust — from first showing to closing day.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: '0 0 auto' }}>
            {isContactPage && agent.phone ? (
              <a href={`tel:${agent.phone}`} style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: '#fff',
                color: 'var(--primary-bg)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.03em',
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Call {agent.name.split(' ')[0]}
              </a>
            ) : (
              <a href={ap('/homes-for-sale')} style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: '#fff',
                color: 'var(--primary-bg)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.03em',
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Browse Homes
              </a>
            )}
            <a href={ap('/home-evaluation')} style={{
              display: 'inline-block',
              padding: '13px 32px',
              background: 'transparent',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.03em',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}>
              Free Home Evaluation
            </a>
          </div>
        </div>
      </div>

      {/* ── Links Section ── */}
      <div style={{ background: '#f8f7f4', borderTop: '1px solid #e8e4dc', padding: '64px var(--container-padding) 48px' }}>
        <div className="container">

          {/* Two-row grid: agent card (left, spans both rows) + utility row + area row */}
          <div className="footer-links-outer">

            {/* Agent card — spans both rows */}
            <div className="footer-agent-card" style={{ paddingRight: 24, borderRight: '1px solid #e2ddd6' }}>
              {coAgents.length > 0 ? (
                <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    {photoSrc && (
                      <img
                        src={photoSrc}
                        alt={agent.name}
                        width={64}
                        height={64}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 20}%`,
                          border: '2px solid #e2ddd6',
                        }}
                      />
                    )}
                    <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 12, marginTop: 6, maxWidth: 72 }}>
                      {agent.name}
                    </div>
                  </div>
                  {coAgents.map(co => (
                    <div key={co.name} style={{ textAlign: 'center' }}>
                      <img
                        src={imgUrl(co.photo, 400)}
                        alt={co.name}
                        width={64}
                        height={64}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          objectPosition: '50% 20%',
                          border: '2px solid #e2ddd6',
                        }}
                      />
                      <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 12, marginTop: 6, maxWidth: 72 }}>
                        {co.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {photoSrc && (
                    <img
                      src={photoSrc}
                      alt={agent.name}
                      width={80}
                      height={80}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        objectPosition: `${agent.photo_focal_x ?? 50}% ${agent.photo_focal_y ?? 20}%`,
                        marginBottom: 16,
                        border: '2px solid #e2ddd6',
                      }}
                    />
                  )}
                  <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 15, marginBottom: 2 }}>
                    {agent.name}
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, color: '#4b5563', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                {agent.brokerage}
              </div>
              {agent.phone && (
                <a href={`tel:${agent.phone}`} style={{
                  display: 'block',
                  color: '#444',
                  fontSize: 14,
                  marginBottom: 6,
                  textDecoration: 'none',
                  fontWeight: 500,
                }}>
                  {agent.phone}
                </a>
              )}
              {agent.email && (
                <a href={`mailto:${agent.email}`} style={{
                  display: 'block',
                  color: '#4b5563',
                  fontSize: 12,
                  textDecoration: 'none',
                }}>
                  {agent.email}
                </a>
              )}
              {/* Social links */}
              {(() => {
                const sl = agent.settings?.social_links
                const links = [
                  sl?.facebook  ? { href: sl.facebook,  svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg> } : null,
                  sl?.instagram ? { href: sl.instagram, svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> } : null,
                  sl?.linkedin  ? { href: sl.linkedin,  svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> } : null,
                  sl?.youtube   ? { href: sl.youtube,   svg: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> } : null,
                ].filter(Boolean)
                if (!links.length) return null
                return (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, marginBottom: 4 }}>
                    {links.map((l, i) => (
                      <a key={i} href={l!.href} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#6b7280', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                      >
                        {l!.svg}
                      </a>
                    ))}
                  </div>
                )
              })()}
              <a href={ap('/contact')} style={{
                display: 'inline-block',
                marginTop: 20,
                padding: '9px 18px',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}>
                Contact
              </a>
            </div>

            {/* Right side: two rows of link columns */}
            <div className="footer-cols-wrapper">

              {/* Row 1 — Utility columns: Search, Market, Resources */}
              <div
                className="footer-row-utility"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${utilityEntries.length}, 1fr)`,
                  gap: '0 32px',
                }}
              >
                {utilityEntries.map(([heading, links]) => (
                  <div key={heading}>
                    <ColHeading>{heading}</ColHeading>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                      {links.map(link => (
                        <li key={link.label}>
                          <LinkItem href={ap(link.href)} label={link.label} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Row 2 — Area columns: Listings by Area, Neighbourhoods, Top Realtor */}
              {areaEntries.length > 0 && (
                <div
                  className="footer-row-area"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: areaGridTemplate,
                    gap: '0 32px',
                    borderTop: '1px solid #e2ddd6',
                    paddingTop: 32,
                    marginTop: 36,
                  }}
                >
                  {areaEntries.map(([heading, links]) => (
                    <div
                      key={heading}
                      className={heading === 'Top Realtor' ? 'footer-col-top-realtor' : undefined}
                    >
                      <ColHeading>{heading}</ColHeading>
                      {heading === 'Listings by Area' ? (
                        /* 2-sub-column layout: Condos left, Houses right per subarea row */
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '11px 12px',
                        }}>
                          {links.map((link, idx) => (
                            <div
                              key={link.label}
                              className={idx >= 6 ? 'footer-area-link-extra' : undefined}
                            >
                              <LinkItem href={ap(link.href)} label={link.label} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                          {links.map(link => (
                            <li key={link.label}>
                              <LinkItem href={ap(link.href)} label={link.label} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Copyright / Legal Row ── */}
          <div style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid #e2ddd6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>
              © {year} {agent.name} &middot; {agent.brokerage}
            </p>
            <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>
              MLS® data provided for informational purposes. E.&amp;O.E.
            </p>
            <div style={{ display: 'flex', gap: 20 }}>
              {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }].map(l => (
                <a
                  key={l.href}
                  href={ap(l.href)}
                  style={{ fontSize: 11, color: '#666', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#666')}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="http://pixilink.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#666', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                Developed by Pixilink
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Desktop layout ── */
        .footer-links-outer {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 0 40px;
          align-items: start;
        }
        .footer-agent-card {
          /* spans both link rows naturally — the right column stretches to match */
        }
        .footer-cols-wrapper {
          min-width: 0;
        }

        /* ── Tablet (≤900px): stack agent card full-width, keep row structure ── */
        @media (max-width: 900px) {
          .footer-links-outer {
            grid-template-columns: 1fr;
            gap: 32px 0;
          }
          .footer-agent-card {
            border-right: none !important;
            border-bottom: 1px solid #e2ddd6;
            padding-right: 0 !important;
            padding-bottom: 32px;
          }
          .footer-row-utility,
          .footer-row-area {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 32px 24px !important;
          }
        }

        /* ── Mobile (≤768px): hide Top Realtor, cap Listings by Area ── */
        @media (max-width: 768px) {
          .footer-col-top-realtor {
            display: none;
          }
          .footer-area-link-extra {
            display: none;
          }
          .footer-row-area {
            /* Recalculate columns since Top Realtor is hidden */
            grid-template-columns: 1fr 1fr !important;
          }
        }

        /* ── Small mobile (≤480px): single column ── */
        @media (max-width: 480px) {
          .footer-row-utility,
          .footer-row-area {
            grid-template-columns: 1fr !important;
            gap: 28px 0 !important;
          }
          footer > div:first-child .container {
            flex-direction: column;
          }
        }
      `}</style>
    </footer>
  )
}
