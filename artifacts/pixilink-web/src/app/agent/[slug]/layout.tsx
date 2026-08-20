/*
 * Varnish VCL — add to vcl_recv to preserve GA cookies in cache key (requires root):
 *
 * sub vcl_recv {
 *   # Strip GA cookies from the cache-key so they don't create per-user cache misses,
 *   # while still allowing them to reach the browser via Set-Cookie in vcl_deliver.
 *   set req.http.Cookie = regsuball(req.http.Cookie, "(^|;\s*)(_ga|_gid|_gat[^;]*)(=[^;]*)?", "");
 *   if (req.http.Cookie == "") { unset req.http.Cookie; }
 * }
 *
 * Without this, Varnish's `unset req.http.Cookie` strips _ga/_gid/_gat entirely,
 * breaking GA4 session continuity for cached pages.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import Script from 'next/script'
import { getAgent, authMe, getAgentTerritories, getListings, getLandingPages, regionSlugForAgent as regionSlugForAgentShared, agentAreaDisplay } from '@/lib/api'
import { toSubareaSlug, fromSubareaSlug } from './homes-for-sale/subareaUtils'
import { resolveTheme, getCoAgents, resolveSiteConfig } from '@/lib/types'
import { getPlatformSettings } from '@/lib/admin-api'
import AgentNav from '@/components/AgentNav'
import AgentFooter from '@/components/AgentFooter'
import AgentValuePropCta from '@/components/AgentValuePropCta'
import W4StickyFooter from '@/components/W4StickyFooter.client'
import AgentSlugProvider from '@/components/AgentSlugProvider'
import GaPageViewTracker from '@/components/GaPageViewTracker.client'
import SuspendedSite from '@/components/SuspendedSite'

// Platform-wide GA4 measurement ID — receives hits on every agent site so
// Pixilink can see aggregate cross-site analytics in a single property.
const PLATFORM_GA4_ID = 'G-FTZ3643N4S'

// Known custom domains — root-relative links work via middleware rewrite, prefix = ''.
const AGENT_DOMAINS = new Set([
  'findfraservalleyhomes.com', 'www.findfraservalleyhomes.com',
  'southsurreywhiterock.com', 'www.southsurreywhiterock.com',
  'randydyck.com', 'www.randydyck.com',
  'suburbia.ca', 'www.suburbia.ca',
])

// residencity.ca region routing — prefix = '/{region-slug}'
const RESIDENCITY_HOSTS = new Set(['residencity.ca', 'www.residencity.ca'])

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [hdrs, agent, platform] = await Promise.all([headers(), getAgent(slug), getPlatformSettings()])
  if (!agent) {
    return {
      title: slug,
      description: `Browse MLS® listings and connect with a local REALTOR® expert.`,
      robots: { index: false, follow: false },
    }
  }

  const coAgents = getCoAgents(agent)
  const displayName = coAgents.length > 0 ? `${agent.name} & ${coAgents[0].name}` : agent.name

  // Compute the canonical host for OG/metadata — must be host-aware so residencity.ca
  // pages don't reference southsurreywhiterock.com images/URLs.
  const reqHost = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]
  // residencity.ca's own middleware proxies zone slugs here without forwarding
  // the original Host header (to avoid a redirect loop with the legacy
  // residencity Host-based logic below), so it sets this marker header instead.
  const residencityZone = hdrs.get('x-residencity-zone')
  const mappedRegionSlug = regionSlugForAgentShared(slug)
  let canonicalHost: string
  if (RESIDENCITY_HOSTS.has(reqHost) || residencityZone) {
    const regionSlug = residencityZone || mappedRegionSlug
    canonicalHost = regionSlug ? `residencity.ca/${regionSlug}` : 'residencity.ca'
  } else if (AGENT_DOMAINS.has(reqHost)) {
    canonicalHost = agent.settings?.custom_domain || reqHost
  } else if (mappedRegionSlug) {
    canonicalHost = `website.pixilink.com/${mappedRegionSlug}`
  } else {
    canonicalHost = agent.settings?.custom_domain || 'findfraservalleyhomes.com'
  }

  const isSouthSurrey = canonicalHost.includes('southsurreywhiterock') || canonicalHost.includes('south-surrey')
  const siteTitle = isSouthSurrey
    ? 'South Surrey White Rock Real Estate'
    : displayName
  const siteDesc = isSouthSurrey
    ? `Condos, townhomes and homes for sale in South Surrey & White Rock. Search MLS listings with ${agent.name}, ${agent.brokerage}.`
    : (agent.bio?.slice(0, 160) || `${displayName} — ${agent.brokerage}`)
  const noindex = platform.global_noindex || (agent.settings?.seo_noindex ?? false) || agent.status === 'suspended'

  return {
    title: { template: `%s | ${siteTitle}`, default: siteTitle },
    description: siteDesc,
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      siteName: siteTitle,
      type: 'website',
      images: [{ url: `https://${canonicalHost}/opengraph.jpg`, width: 1200, height: 630, alt: siteTitle }],
    },
  }
}

export default async function AgentLayout({ children, params }: Props) {
  const { slug } = await params
  const [jar, hdrs] = await Promise.all([cookies(), headers()])
  const sessionToken = jar.get('pxl_session')?.value

  const [agent, user, territories, landingPages] = await Promise.all([
    getAgent(slug),
    sessionToken ? authMe(sessionToken) : Promise.resolve(null),
    getAgentTerritories(slug),
    getLandingPages(slug),
  ])

  if (!agent) notFound()
  if (agent.status === 'suspended') return <SuspendedSite agentName={agent.name} />
  if (agent.status !== 'active') notFound()

  // Filter out subarea territories that have no active listings so the footer
  // doesn't link to empty pages. City-only rows (no subarea) pass through as-is.
  let filteredTerritories = territories
  try {
    const uniqueSubareas = [
      ...new Set(
        territories
          .map(t => t.subarea)
          .filter((s): s is string => Boolean(s))
      ),
    ]
    if (uniqueSubareas.length > 0) {
      // Query using the live MLS label (some agent_territories rows store a stale/
      // pre-relabel subarea string, e.g. missing a trailing period, that returns 0
      // active listings even though the subarea is genuinely active under its
      // current MLS label). Round-tripping through the slug map normalizes it.
      const counts = await Promise.all(
        uniqueSubareas.map(subarea => {
          const liveLabel = fromSubareaSlug(toSubareaSlug(subarea))
          return getListings(slug, { subarea: liveLabel, limit: 1 }).then(r => ({ subarea, total: r.total }))
        })
      )
      const activeSubareas = new Set(
        counts.filter(c => c.total > 0).map(c => c.subarea)
      )
      filteredTerritories = territories.filter(
        t => !t.subarea || activeSubareas.has(t.subarea)
      )
    }
  } catch {
    // Safe degradation: show all territories if the check fails
  }

  const theme = resolveTheme(agent)
  const cfg = resolveSiteConfig(agent)
  // Only inject per-agent colours into the brand-zone variables.
  // --primary-bg and --accent remain fixed (from globals.css) so all content pages
  // look identical across agents. Branding shows only in the sticky bar + contact sidebar.
  const cssVars = `--brand-bg:${theme.primaryBg};--brand-accent:${theme.accent};--brand-accent-rgb:${theme.accentRgb};--brand-text:${theme.brandText};--brand-overlay-rgb:${theme.brandOverlayRgb};--brand-bg-rgb:${theme.brandBgRgb};`

  // Font-pair — set via data-font-pair attribute on the wrapper div and CSS in globals.css.
  // 'serif-sans' is the default (Playfair Display headings + Inter body) — no attribute needed.
  // 'geometric' requires DM Sans from Google Fonts; we inject the <link> conditionally.
  const needsDmSans = cfg.font_pair === 'geometric'

  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || '').split(':')[0]
  // See generateMetadata() above — residencity.ca's middleware proxies here
  // without the original Host header, so it sets this marker instead.
  const residencityZone = hdrs.get('x-residencity-zone')
  const isDomainMode = AGENT_DOMAINS.has(host)
  // Region-mapped agents (tricity, burnaby) are ONLY ever reachable via their region
  // path on website.pixilink.com — derive this from the agent slug itself (pure,
  // header-independent) rather than relying solely on x-residencity-zone. That header
  // is set by middleware's rewrite but does not reliably survive into this layout —
  // layout output for a given /agent/:slug segment can be reused across requests
  // independently of that specific request's injected headers. See MEMORY.md.
  const mappedRegionSlug = regionSlugForAgentShared(slug)
  const isResidencityMode = RESIDENCITY_HOSTS.has(host) || Boolean(residencityZone) || Boolean(mappedRegionSlug)

  let agentPrefix: string
  let signInUrl: string
  if (isDomainMode) {
    agentPrefix = ''
    signInUrl = '/sign-in'
  } else if (isResidencityMode) {
    const regionSlug = residencityZone || mappedRegionSlug
    agentPrefix = regionSlug ? `/${regionSlug}` : `/agent/${slug}`
    signInUrl = `${agentPrefix}/sign-in`
  } else {
    agentPrefix = `/agent/${slug}`
    signInUrl = `/agent/${slug}/sign-in`
  }

  const ga4Id = agent.settings?.ga4_id ?? null
  const fbPixelId = agent.settings?.fb_pixel_id ?? null
  const ghlEnabled = agent.settings?.ghl_enabled ?? false
  const ghlApiKey = agent.settings?.ghl_api_key ?? null

  // Ad-landing pages (e.g. /get-home-value) opt out of the normal site chrome —
  // no nav/footer/sticky-footer/value-prop CTA, just the page content — via a
  // header stamped by middleware.ts (isMinimalLanding). GA4/FB Pixel still load
  // since ad conversion tracking is the whole point of these pages.
  const isMinimalLayout = hdrs.get('x-minimal-layout') === '1'

  const trackingScripts = (
    <>
      {/*
        The platform property (G-FTZ3643N4S) always loads so Pixilink receives
        aggregate data from every agent site, even those without a per-agent ID.
        The gtag.js loader is bootstrapped with the platform ID; the per-agent ID
        is added as a second config() call only when the agent has one set.

        data-cfasync="false" prevents Cloudflare Rocket Loader from deferring
        this script. Rocket Loader batches <script> tags into a deferred bundle
        which delays GA4 init and breaks first-page-load hit delivery on CF-cached
        pages. next/script passes arbitrary props through to the underlying <script>
        element so this attribute works without switching to a raw <script> tag.
      */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${PLATFORM_GA4_ID}`}
        strategy="afterInteractive"
        data-cfasync="false"
      />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${PLATFORM_GA4_ID}', { transport_type: 'beacon', send_page_view: false });
        ${ga4Id ? `gtag('config', '${ga4Id}', { transport_type: 'beacon', send_page_view: false });` : ''}
      `}</Script>
      <GaPageViewTracker />
      {fbPixelId && (
        <Script id="fb-pixel-init" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${fbPixelId}');
          fbq('track', 'PageView');
        `}</Script>
      )}
      {ghlEnabled && ghlApiKey && (
        <Script
          src="https://widgets.leadconnectorhq.com/loader.js"
          data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
          data-widget-id={ghlApiKey}
          strategy="afterInteractive"
        />
      )}
    </>
  )

  if (isMinimalLayout) {
    return (
      <AgentSlugProvider prefix={agentPrefix} signInUrl={signInUrl} initialIsLoggedIn={Boolean(user)}>
        {trackingScripts}
        <div style={{ ['--brand-bg' as string]: theme.primaryBg, ['--brand-accent' as string]: theme.accent, ['--brand-accent-rgb' as string]: theme.accentRgb, ['--brand-text' as string]: theme.brandText, ['--brand-overlay-rgb' as string]: theme.brandOverlayRgb, ['--brand-bg-rgb' as string]: theme.brandBgRgb }}>
          <style>{`:root{${cssVars}}`}</style>
          {children}
        </div>
      </AgentSlugProvider>
    )
  }

  return (
    <AgentSlugProvider prefix={agentPrefix} signInUrl={signInUrl} initialIsLoggedIn={Boolean(user)}>
      {trackingScripts}
      <div
        data-palette={cfg.palette}
        data-font-pair={cfg.font_pair !== 'serif-sans' ? cfg.font_pair : undefined}
        style={{ ['--brand-bg' as string]: theme.primaryBg, ['--brand-accent' as string]: theme.accent, ['--brand-accent-rgb' as string]: theme.accentRgb, ['--brand-text' as string]: theme.brandText, ['--brand-overlay-rgb' as string]: theme.brandOverlayRgb, ['--brand-bg-rgb' as string]: theme.brandBgRgb }}>
        {needsDmSans && (
          // eslint-disable-next-line @next/next/no-page-custom-font
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
            precedence="default"
          />
        )}
        <style>{`:root{${cssVars}}`}</style>
        <AgentNav agent={agent} user={user} navStyle={cfg.nav_style} />
        {(() => {
          const showStickyBar = !agent.settings?.disable_sticky_bar && cfg.layout_preset !== 'showcase'
          return (
            <>
              <main style={{ paddingTop: 'var(--nav-height)', paddingBottom: showStickyBar ? 'var(--sticky-footer-height)' : undefined }}>
                {children}
                {/* Showcase pages already close with their own CTA plus the footer's
                    "Let's find your next home" band, so this card was a third ask in the
                    same screen - "Free Home Evaluation" appeared three times and
                    "Contact {name}" twice on /featured-properties and /sell-with-me. The
                    showcase homepage was already hiding it with a display:none override,
                    which is the same judgement made less cleanly. Gating it here removes
                    it from all six showcase pages and leaves other presets untouched,
                    where it is often the only mid-page CTA. */}
                {cfg.layout_preset !== 'showcase' && (
                  <div className="layout-value-prop container" style={{ padding: '0 var(--container-padding) 48px' }}>
                    <AgentValuePropCta agent={agent} />
                  </div>
                )}
              </main>
              <AgentFooter agent={agent} territories={filteredTerritories} landingPages={landingPages} />
              {showStickyBar && (
                <W4StickyFooter agent={agent} neighbourhood={territories.length > 0 ? agentAreaDisplay(territories) : undefined} />
              )}
            </>
          )
        })()}
      </div>
    </AgentSlugProvider>
  )
}
