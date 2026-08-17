# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /workspace

# pnpm-workspace.yaml is needed to resolve `catalog:` version entries.
# The resolver script rewrites package.json with real semver before npm install.
# We use npm (not pnpm) so pnpm v11's build-script approval gate doesn't block
# native deps like sharp@0.33.5.
COPY pnpm-workspace.yaml ./
COPY scripts/docker/resolve-catalog.js ./scripts/docker/

# Cache-busting: forces the COPY below (and everything after it) to re-run on
# every deploy. Without this, Docker's build cache has been observed to mark
# `COPY artifacts/pixilink-web ...` as CACHED even when the source tarball's
# contents changed (e.g. a newly-added route directory silently missing from
# the built image) — see replit.md persona-page 404 incident, July 2026.
ARG CACHEBUST=0
RUN echo "cachebust=${CACHEBUST}" > /tmp/cachebust

COPY artifacts/pixilink-web ./artifacts/pixilink-web

# Resolve catalog: → real versions, then install
RUN node scripts/docker/resolve-catalog.js && \
    npm install --prefix artifacts/pixilink-web --legacy-peer-deps react-is

# Build Next.js standalone output
RUN cd artifacts/pixilink-web && \
    NEXT_PUBLIC_BASE_PATH="" NODE_ENV=production \
    NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1IjoicGl4aWxpbmsiLCJhIjoiY21xemV4enRkMDFyZTJyb2x5MjFraWN2MSJ9.tFtwyK7Ztezfwm73UXYntg" \
    ./node_modules/.bin/next build

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output: server.js sits at the root (build ran from inside the
# artifact dir, so there is no workspace-level nesting here).
COPY --from=builder --chown=nextjs:nodejs \
  /workspace/artifacts/pixilink-web/.next/standalone ./

# Static chunks — Next.js standalone expects them at ./.next/static/
COPY --from=builder --chown=nextjs:nodejs \
  /workspace/artifacts/pixilink-web/.next/static \
  ./.next/static

# Public files — Next.js standalone expects them at ./public/
COPY --from=builder --chown=nextjs:nodejs \
  /workspace/artifacts/pixilink-web/public \
  ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
