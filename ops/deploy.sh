#!/usr/bin/env bash
set -euo pipefail
CONTAINER_NAME="sswr"
CONTAINER_PORT="4000"
REMOTE_DIR="/home/websitemanager/sswr-app"
LOG_FILE="/home/websitemanager/sswr-app/deploy.log"

cd "$REMOTE_DIR"


echo "[$(date)] Building Docker image (next build runs inside)..."
# CACHEBUST forces the Dockerfile's source COPY layer to invalidate on every
# deploy — Docker's build cache has been observed to mark that COPY as CACHED
# even when the uploaded source tarball's contents actually changed, which
# silently shipped a build missing a newly-added route. See Dockerfile comment.
# --network host: the docker bridge network has no outbound connectivity on
# this host (DNS times out, ICMP to 8.8.8.8 fails), so npm install inside the
# build dies with EAI_AGAIN registry.npmjs.org. Fixing the bridge needs
# iptables/csf changes as root, which this account does not have. The runtime
# container already uses host networking, so the build now matches it.
docker build --network host --build-arg CACHEBUST="$(date +%s)" -t pixilink-sswr:latest app_src/

echo "[$(date)] Stopping old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm   "$CONTAINER_NAME" 2>/dev/null || true

echo "[$(date)] Starting new container..."
LARAVEL_ENV="/home/websitemanager/bcchv2/.env"
ADMIN_JWT="$(sed -n 's/^ADMIN_JWT_SECRET=//p' "$LARAVEL_ENV")"
ADMIN_API="$(sed -n 's/^ADMIN_API_SECRET=//p' "$LARAVEL_ENV")"
ANTHROPIC_KEY="$(sed -n 's/^ANTHROPIC_API_KEY=//p' "$LARAVEL_ENV")"

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --network=host \
  -e PORT="$CONTAINER_PORT" \
  -e LARAVEL_API_URL=http://127.0.0.1:8082 \
  -e LARAVEL_API_HOST=website.pixilink.com \
  -e NODE_ENV=production \
  -e ADMIN_JWT_SECRET="$ADMIN_JWT" \
  -e ADMIN_API_SECRET="$ADMIN_API" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_KEY" \
  pixilink-sswr:latest

sleep 5
docker ps | grep "$CONTAINER_NAME" && echo "[$(date)] Container running OK" || echo "WARNING: container not found"

echo "[$(date)] Health check..."
curl -sf "http://127.0.0.1:${CONTAINER_PORT}/" -o /dev/null \
  && echo "Health: OK" \
  || echo "Health: FAILED (may still be starting)"

echo "[$(date)] Warming ISR cache for high-traffic pages..."
sleep 8

# ── Domain-owning agents — warm through their CANONICAL domain ────────────────
# Never warm these through a legacy domain or a region path: legacy domains 301
# (the curl "succeeds" and warms nothing), and region paths now 308 — and before
# they redirected, warming tricity via website.pixilink.com/tricity was baking
# '/tricity'-prefixed links into suburbia.ca's shared ISR entries after every
# deploy (the cross-host cache poisoning fixed in middleware.ts).
warm_domain() {
  local HOST="$1"; local LABEL="$2"; shift 2
  for PAGE in "$@"; do
    curl -sf --max-time 20 -H "Host: ${HOST}" "http://127.0.0.1:${CONTAINER_PORT}${PAGE}" -o /dev/null \
      && echo "  Warmed [${LABEL}]: ${PAGE}" || echo "  Skipped (not ready): [${LABEL}] ${PAGE}"
  done
}

warm_domain findfraservalleyhomes.com randy \
  / /about /market /buildings /condos-for-sale /houses-for-sale /townhouses-for-sale \
  /neighbourhood/white-rock /neighbourhood/ocean-park /neighbourhood/crescent-beach

warm_domain suburbia.ca tricity / /about /market /buildings

warm_domain shareneshuster.com sharene \
  / /about /sell-with-me /featured-properties /contact /search /home-evaluation

# ── Region-only agents (no custom domain) — the region path IS their site ─────
for PAGE in / /about /market /buildings; do
  curl -sf --max-time 20 -H "Host: website.pixilink.com" "http://127.0.0.1:${CONTAINER_PORT}/burnaby${PAGE}" -o /dev/null \
    && echo "  Warmed [burnaby]: ${PAGE}" || true
done

echo "[$(date)] Cache warm-up complete"

echo "[$(date)] Pruning old images..."
docker image prune -f

echo "[$(date)] Verifying llms.txt content..."
# Retried: the first render after a container swap can miss a section when a data fetch
# (market stats especially) times out against a still-cold Laravel — observed once as a
# false "Market Intelligence missing" 20s after start, self-healed on the next request.
# Three attempts, 15s apart, before declaring the file genuinely incomplete.
LLMS_OK=0
for LLMS_TRY in 1 2 3; do
  [[ $LLMS_TRY -gt 1 ]] && { echo "  retry $LLMS_TRY/3 in 15s..."; sleep 15; }
  LLMS_BODY=$(curl -sfL --max-time 30 "https://findfraservalleyhomes.com/llms.txt?cb=$(date +%s)") || LLMS_BODY=""
  [[ -z "$LLMS_BODY" ]] && { echo "  [FAIL] empty or unfetchable llms.txt" >&2; continue; }
  LLMS_FAIL=0
  for SECTION in   "## Service Area"   "## Active Market Snapshot"   "## Browse by Property Type"   "## Neighbourhood Guides"   "## Buyer & Seller Resources"   "## Market Intelligence"   "## Key Pages"; do
    if echo "$LLMS_BODY" | grep -qF "$SECTION"; then
      echo "  [OK]  $SECTION"
    else
      echo "  [FAIL] Missing required section: '$SECTION'" >&2
      LLMS_FAIL=$((LLMS_FAIL + 1))
    fi
  done
  [[ $LLMS_FAIL -eq 0 ]] && { LLMS_OK=1; break; }
done
if [[ $LLMS_OK -ne 1 ]]; then
  echo "ERROR: llms.txt still incomplete after 3 attempts — AI crawlers may index an incomplete file" >&2
  exit 1
fi
echo "[$(date)] llms.txt OK — all sections present"

# Per-domain llms.txt reachability. The deep section check above only ever looked at
# findfraservalleyhomes.com, and its section list is hub-preset-specific ("Browse by
# Property Type", "Market Intelligence") — sections a showcase site legitimately does
# not have. So it was structurally blind to the other domains, and on 2026-08-20
# shareneshuster.com/llms.txt served a hard 500 (a TypeError on settings.languages)
# through several green deploys.
#
# Assert only the preset-independent invariants, per canonical domain:
#   HTTP 200, a "# Name" title, and the two sections every preset emits.
# -w '%{http_code}' rather than curl -sf: -f alone would also mask a 3xx, and the
# whole point here is to see each domain's real status.
echo "[$(date)] Verifying llms.txt reachability on every canonical domain..."
LLMS_DOMAIN_FAIL=0
for LLMS_DOMAIN in findfraservalleyhomes.com suburbia.ca shareneshuster.com; do
  LLMS_TMP=$(mktemp)
  LLMS_CODE=$(curl -sL --max-time 30 -o "$LLMS_TMP" -w '%{http_code}' \
    "https://${LLMS_DOMAIN}/llms.txt?cb=$(date +%s)" || echo 000)
  if [[ "$LLMS_CODE" != "200" ]]; then
    echo "  [FAIL] ${LLMS_DOMAIN}/llms.txt returned HTTP ${LLMS_CODE}" >&2
    LLMS_DOMAIN_FAIL=$((LLMS_DOMAIN_FAIL + 1))
  else
    LLMS_MISSING=""
    grep -q '^# .' "$LLMS_TMP"                 || LLMS_MISSING="$LLMS_MISSING title"
    grep -qF '## Key Pages' "$LLMS_TMP"        || LLMS_MISSING="$LLMS_MISSING '## Key Pages'"
    grep -qF '## Active Market Snapshot' "$LLMS_TMP" \
      || LLMS_MISSING="$LLMS_MISSING '## Active Market Snapshot'"
    if [[ -n "$LLMS_MISSING" ]]; then
      echo "  [FAIL] ${LLMS_DOMAIN}/llms.txt missing:${LLMS_MISSING}" >&2
      LLMS_DOMAIN_FAIL=$((LLMS_DOMAIN_FAIL + 1))
    else
      echo "  [OK]  ${LLMS_DOMAIN} ($(grep -c '^## ' "$LLMS_TMP") sections, $(wc -c < "$LLMS_TMP") bytes)"
    fi
  fi
  rm -f "$LLMS_TMP"
done
if [[ $LLMS_DOMAIN_FAIL -ne 0 ]]; then
  echo "ERROR: ${LLMS_DOMAIN_FAIL} domain(s) serving a broken llms.txt" >&2
  exit 1
fi

# Dead-internal-link check. Three separate "this page is not working" reports in a row
# (/llms.txt, then the whole /{type}/{city} family, then /new-construction) were all
# things a crawl of the site's own links would have caught immediately: pages gated off
# for an agent while the nav, footer or body still linked them. Each homepage carries the
# full footer, which is where those link lists live, so one page per domain gives good
# coverage cheaply.
#
# A failing link is retried once before being reported, so a transient upstream blip does
# not fail the deploy. Redirects count as failures on purpose: a 3xx here means we are
# linking a non-canonical path (that is how the redundant /townhomes-for-sale link
# surfaced). Query strings and fragments are stripped; Next's own /icon and /apple-icon
# metadata routes are skipped.
echo "[$(date)] Checking internal links for dead ends..."
LINK_FAIL_TOTAL=0
for LINK_DOMAIN in findfraservalleyhomes.com suburbia.ca shareneshuster.com; do
  LINK_HREFS=$(curl -sL --max-time 30 "https://${LINK_DOMAIN}/" \
    | grep -o 'href="/[^"#?]*"' | sed 's/href="//;s/"//' \
    | sort -u | grep -v '^/_next' | grep -v '/icon$' | grep -v '/apple-icon$')
  if [[ -z "$LINK_HREFS" ]]; then
    echo "  [FAIL] ${LINK_DOMAIN}: could not read any links off the homepage" >&2
    LINK_FAIL_TOTAL=$((LINK_FAIL_TOTAL + 1))
    continue
  fi
  LINK_N=0; LINK_BAD=0
  for HREF in $LINK_HREFS; do
    LINK_N=$((LINK_N + 1))
    CODE=$(curl -s -o /dev/null --max-time 30 -w '%{http_code}' "https://${LINK_DOMAIN}${HREF}")
    if [[ "$CODE" != "200" ]]; then
      CODE=$(curl -s -o /dev/null --max-time 30 -w '%{http_code}' "https://${LINK_DOMAIN}${HREF}")
      if [[ "$CODE" != "200" ]]; then
        echo "  [FAIL] ${LINK_DOMAIN}${HREF} -> HTTP ${CODE}" >&2
        LINK_BAD=$((LINK_BAD + 1))
      fi
    fi
  done
  echo "  [${LINK_DOMAIN}] ${LINK_N} links checked, ${LINK_BAD} bad"
  LINK_FAIL_TOTAL=$((LINK_FAIL_TOTAL + LINK_BAD))
done
if [[ $LINK_FAIL_TOTAL -ne 0 ]]; then
  echo "ERROR: ${LINK_FAIL_TOTAL} internal link(s) not returning 200 — the sites are linking their own dead pages" >&2
  exit 1
fi

echo "[$(date)] === DEPLOY DONE ==="
