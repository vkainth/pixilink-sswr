import type { NextConfig } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const isProd = process.env.NODE_ENV === 'production'

// Allow Replit dev proxy origins (dynamic picard.replit.dev subdomains)
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN || ''
const allowedDevOrigins: string[] = [
  '*.picard.replit.dev',
  '*.replit.dev',
  ...(replitDevDomain ? [replitDevDomain] : []),
]


const nextConfig: NextConfig = {
  basePath,
  trailingSlash: false,
  // Suppress X-Powered-By: Next.js header — avoids exposing the tech stack
  poweredByHeader: false,
  // Skip TS type-check and ESLint during `next build` — saves ~30s per deploy.
  // We run `pnpm --filter @workspace/pixilink-web run typecheck` locally before
  // every deploy, so this check is redundant inside Docker.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Use plain <img> tags with Pixilink image server CDN (?w= params).
  // remotePatterns wildcard allows any HTTPS hostname — safe because unoptimized:true
  // means Next.js never proxies/optimises these images, it's just a config guard.
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  allowedDevOrigins,
  // Standalone output for production deployment (self-contained Node.js server)
  ...(isProd ? { output: 'standalone' } : {}),
  // Re-compile packages with SWC (modern targets) to strip legacy Babel polyfills.
  // recharts + victory-vendor: ship with CJS/Babel class-transform output.
  // nextjs-toploader: uses class syntax that triggers @babel/plugin-transform-classes.
  transpilePackages: ['recharts', 'victory-vendor', 'nextjs-toploader'],
  // Load these AI SDKs from node_modules at runtime rather than bundling via
  // webpack — avoids dynamic-require and native-module issues inside the
  // Next.js server bundle.  The standalone tracer copies them automatically.
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai'],
  experimental: {
    // Inline critical CSS, defer non-critical → fixes render-blocking CSS warnings
    optimizeCss: true,
  },
  // Default is 60s. With ~3,700 statically generated pages hitting live MLS
  // queries during build, a handful of pages routinely exceed 60s under load,
  // which aborts the ENTIRE build after 3 retries on any single slow page.
  // Raised to reduce build flakiness/failed deploys; does not affect runtime.
  staticPageGenerationTimeout: 180,
  async rewrites() {
    // On custom agent domains, /sign-in must resolve to the real Next.js route.
    // Without this, the server has no matching page and falls back to the home page.
    // The AGENT_DOMAINS set in layout.tsx is the source of truth; keep in sync.
    const agentDomainSignInRewrites = [
      'findfraservalleyhomes.com',
      'www.findfraservalleyhomes.com',
      'southsurreywhiterock.com',
      'www.southsurreywhiterock.com',
      'randydyck.com',
      'www.randydyck.com',
    ].map(domain => ({
      source: '/sign-in',
      has: [{ type: 'host' as const, value: domain }],
      destination: '/agent/randy/sign-in',
    }))

    // Forward Laravel storage files (agent photos, uploads) through Next.js domain.
    // This lets the browser load /storage/... URLs without exposing port 8082.
    const laravelInternalUrl = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'http://127.0.0.1:8082'
    const storageRewrites = [
      {
        source: '/storage/:path*',
        destination: `${laravelInternalUrl}/storage/:path*`,
      },
    ]

    // Rewrite /sitemap-sold-YYYY.xml to internal route /sitemap-sold-year/YYYY
    // because Next.js App Router does not support partial dynamic segments
    // (prefix+[param]+suffix) in folder names.
    const soldYearRewrites = [
      {
        source: '/sitemap-sold-:year(\\d{4}).xml',
        destination: '/sitemap-sold-year/:year',
      },
    ]

    // Rewrite residencity.ca zone sitemaps to internal routes.
    // /sitemap-[zone]-active.xml       → /sitemap-zone-active/[zone]
    // /sitemap-[zone]-sold-YYYY.xml    → /sitemap-zone-sold/[zone]/YYYY
    // path-to-regexp backtracking ensures :zone captures only up to the
    // known suffix (-active or -sold-YYYY), so zone slugs with hyphens work.
    const zoneActiveRewrites = [
      {
        source: '/sitemap-:zone-active.xml',
        destination: '/sitemap-zone-active/:zone',
      },
    ]
    const zoneSoldRewrites = [
      {
        source: '/sitemap-:zone-sold-:year(\\d{4}).xml',
        destination: '/sitemap-zone-sold/:zone/:year',
      },
    ]

    return [...agentDomainSignInRewrites, ...storageRewrites, ...soldYearRewrites, ...zoneActiveRewrites, ...zoneSoldRewrites]
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js hashes all static chunk filenames — safe to cache for 1 year.
      // Without this, Cloudflare/browsers use the default 4-hour TTL and Lighthouse
      // flags "Use efficient cache lifetimes" for JS, CSS, and font chunks.
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Block indexing of the internal admin/preview domain — real agent sites
      // live on their own canonical domains (southsurreywhiterock.com, residencity.ca).
      {
        source: '/(.*)',
        has: [{ type: 'host' as const, value: 'website\\.pixilink\\.com' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  async redirects() {
    // Helper: build type-normalisation redirect pairs (uppercase → lowercase for homes-for-sale)
    const typeRedirects = (['Apartment', 'Townhouse', 'House', 'Duplex'] as const).flatMap(upper => {
      const lower = upper.toLowerCase()
      return [
        // Production (domain mode)
        {
          source: '/homes-for-sale',
          has: [{ type: 'query' as const, key: 'type', value: upper }],
          destination: `/homes-for-sale?type=${lower}`,
          permanent: true,
        },
        // Dev (path mode)
        {
          source: '/agent/:slug/homes-for-sale',
          has: [{ type: 'query' as const, key: 'type', value: upper }],
          destination: `/agent/:slug/homes-for-sale?type=${lower}`,
          permanent: true,
        },
      ]
    })

    return [
      // ── www → non-www canonical redirect ────────────────────────────────
      {
        source: '/:path*',
        has: [{ type: 'host' as const, value: 'www.southsurreywhiterock.com' }],
        destination: 'https://southsurreywhiterock.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host' as const, value: 'www.randydyck.com' }],
        destination: 'https://randydyck.com/:path*',
        permanent: true,
      },

      // ── /new-homes → /new-construction (SEO variant redirect) ──────────
      { source: '/new-homes', destination: '/new-construction', permanent: true },
      { source: '/new-homes/:path*', destination: '/new-construction/:path*', permanent: true },
      { source: '/agent/:slug/new-homes', destination: '/agent/:slug/new-construction', permanent: true },
      { source: '/agent/:slug/new-homes/:path*', destination: '/agent/:slug/new-construction/:path*', permanent: true },

      // ── Clean URL redirects: ?min_year=YYYY → /built-YYYY at subarea level ─
      // MUST appear before agent-slug canonical redirects so they fire first
      // (otherwise /agent/saeed-farhani-ppqu/... is canonicalised before the
      //  clean-URL redirect can match the dev-mode path).
      //
      // Burnaby canonical (residencity.ca/burnaby/homes-for-sale/{subarea}?min_year=YYYY)
      {
        source: '/burnaby/homes-for-sale/:subarea',
        has: [{ type: 'query' as const, key: 'min_year', value: '(?<year>\\d{4})' }],
        destination: '/burnaby/homes-for-sale/:subarea/built-:year',
        permanent: true,
      },
      // Other agent canonical domains (/homes-for-sale/{subarea}?min_year=YYYY)
      {
        source: '/homes-for-sale/:subarea',
        has: [{ type: 'query' as const, key: 'min_year', value: '(?<year>\\d{4})' }],
        destination: '/homes-for-sale/:subarea/built-:year',
        permanent: true,
      },
      // Dev (path mode): /agent/{slug}/homes-for-sale/{subarea}?min_year=YYYY
      {
        source: '/agent/:slug/homes-for-sale/:subarea',
        has: [{ type: 'query' as const, key: 'min_year', value: '(?<year>\\d{4})' }],
        destination: '/agent/:slug/homes-for-sale/:subarea/built-:year',
        permanent: true,
      },

      // ── Clean URL redirects: ?price_reduced=1 → /price-reduced at subarea level
      // Same ordering requirement — before agent-slug canonical redirects.
      //
      // Burnaby canonical (residencity.ca/burnaby/homes-for-sale/{subarea}?price_reduced=1)
      {
        source: '/burnaby/homes-for-sale/:subarea',
        has: [{ type: 'query' as const, key: 'price_reduced', value: '1' }],
        destination: '/burnaby/homes-for-sale/:subarea/price-reduced',
        permanent: true,
      },
      // Other agent canonical domains (/homes-for-sale/{subarea}?price_reduced=1)
      {
        source: '/homes-for-sale/:subarea',
        has: [{ type: 'query' as const, key: 'price_reduced', value: '1' }],
        destination: '/homes-for-sale/:subarea/price-reduced',
        permanent: true,
      },
      // Dev (path mode): /agent/{slug}/homes-for-sale/{subarea}?price_reduced=1
      {
        source: '/agent/:slug/homes-for-sale/:subarea',
        has: [{ type: 'query' as const, key: 'price_reduced', value: '1' }],
        destination: '/agent/:slug/homes-for-sale/:subarea/price-reduced',
        permanent: true,
      },

      // ── residencity.ca: /agent/randy/* → /south-surrey/* ───────────────────
      // Must appear BEFORE the southsurreywhiterock.com canonical redirect below.
      // next.config.ts redirects fire before middleware, so this is the only
      // reliable way to redirect hardcoded /agent/ links for residencity.ca visitors.
      {
        source: '/agent/randy',
        has: [{ type: 'host', value: 'residencity\\.ca' }],
        destination: '/south-surrey',
        permanent: true,
      },
      {
        source: '/agent/randy/:path+',
        has: [{ type: 'host', value: 'residencity\\.ca' }],
        destination: '/south-surrey/:path+',
        permanent: true,
      },

      // ── /agent/randy/* → southsurreywhiterock.com (308, canonical domain) ─
      // Prevents Google from indexing duplicate content at website.pixilink.com/agent/randy/*
      {
        source: '/agent/randy',
        destination: 'https://southsurreywhiterock.com',
        permanent: true,
      },
      {
        source: '/agent/randy/:path+',
        destination: 'https://southsurreywhiterock.com/:path+',
        permanent: true,
      },

      // NOTE: /agent/tricity and /agent/saeed-farhani-ppqu used to redirect here
      // to residencity.ca/tricity and residencity.ca/burnaby. That was correct
      // back when pixilink-web itself served the residencity.ca hub. Now that
      // residencity.ca is its own standalone app (artifacts/residencity) that
      // reverse-proxies these exact paths INTO pixilink-web to render the
      // agent's real site, those redirects created an infinite redirect loop
      // (residencity.ca/tricity → proxy → /agent/tricity → redirect back to
      // residencity.ca/tricity → ...). Do not re-add them — the region→domain
      // mapping and canonical URLs are handled entirely inside the residencity
      // app's own middleware/zones.ts now.

      // ── Type param normalisation (uppercase → lowercase) ──────────────────
      // Note: middleware also handles /homes-for-sale?type=X → /type-page redirects
      // (stripping the type param correctly). next.config.ts handles uppercase
      // normalisation for other pages and the listings endpoint.
      ...typeRedirects,

      // ── /listings → /homes-for-sale (301, preserves query string) ────────
      // Production (domain mode): user hits southsurreywhiterock.com/listings
      {
        source: '/listings',
        destination: '/homes-for-sale',
        permanent: true,
      },
      {
        source: '/listings/:path*',
        destination: '/homes-for-sale/:path*',
        permanent: true,
      },
      // Dev (path mode): /agent/:slug/listings
      {
        source: '/agent/:slug/listings',
        destination: '/agent/:slug/homes-for-sale',
        permanent: true,
      },
      {
        source: '/agent/:slug/listings/:path*',
        destination: '/agent/:slug/homes-for-sale/:path*',
        permanent: true,
      },

      // ── /townhomes-for-sale → /townhouses-for-sale ────────────────────────
      {
        source: '/townhomes-for-sale',
        destination: '/townhouses-for-sale',
        permanent: true,
      },
      {
        source: '/agent/:slug/townhomes-for-sale',
        destination: '/agent/:slug/townhouses-for-sale',
        permanent: true,
      },

      // ── Market tab/type → clean archive URLs ─────────────────────────────
      // NOTE: ?tab= and /market/archive?type= redirects are handled in
      // middleware.ts so that query strings can be stripped from the
      // destination (next.config.ts redirects always forward the original
      // query string, which would produce /market/archive?tab=archive).

      // ── Neighbourhood alias redirects ────────────────────────────────────
      // "south-surrey" is not a specific MLS subarea — it's the agent's whole
      // territory. Redirect to the neighbourhood directory.
      // Production (domain mode)
      {
        source: '/neighbourhood/south-surrey',
        destination: '/neighbourhoods',
        permanent: true,
      },
      {
        source: '/neighbourhood/south-surrey-white-rock',
        destination: '/neighbourhoods',
        permanent: true,
      },
      // Dev (path mode)
      {
        source: '/agent/:slug/neighbourhood/south-surrey',
        destination: '/agent/:slug/neighbourhoods',
        permanent: true,
      },
      {
        source: '/agent/:slug/neighbourhood/south-surrey-white-rock',
        destination: '/agent/:slug/neighbourhoods',
        permanent: true,
      },

      // ── /team → /about (308, team page removed) ─────────────────────────
      // Production (domain mode — southsurreywhiterock.com/team)
      { source: '/team', destination: '/about', permanent: true },
      // Dev (path mode — /agent/:slug/team)
      { source: '/agent/:slug/team', destination: '/agent/:slug/about', permanent: true },
      // Region paths (e.g. /tricity/team, /burnaby/team via website.pixilink.com)
      { source: '/tricity/team', destination: '/tricity/about', permanent: true },
      { source: '/burnaby/team', destination: '/burnaby/about', permanent: true },

      // ── Market pages → /market (301, no SEO equity lost) ─────────────────
      // Production (domain mode)
      {
        source: '/market-stats',
        destination: '/market',
        permanent: true,
      },
      {
        source: '/market-stats/:subarea',
        destination: '/market/:subarea',
        permanent: true,
      },
      {
        source: '/market-report',
        destination: '/market/archive',
        permanent: true,
      },
      {
        source: '/market-reports',
        destination: '/market/archive',
        permanent: true,
      },
      // Dev (path mode)
      {
        source: '/agent/:slug/market-stats',
        destination: '/agent/:slug/market',
        permanent: true,
      },
      {
        source: '/agent/:slug/market-stats/:subarea',
        destination: '/agent/:slug/market/:subarea',
        permanent: true,
      },
      {
        source: '/agent/:slug/market-report',
        destination: '/agent/:slug/market/archive',
        permanent: true,
      },
      {
        source: '/agent/:slug/market-reports',
        destination: '/agent/:slug/market/archive',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
