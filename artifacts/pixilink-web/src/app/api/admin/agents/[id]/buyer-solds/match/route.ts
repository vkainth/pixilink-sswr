import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function adminHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

async function laravelAdminFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${LARAVEL_URL}/api-internal/admin${path}`, {
    ...opts,
    headers: { ...adminHeaders(), ...((opts.headers as Record<string, string>) || {}) },
  })
}

/**
 * Extract the first meaningful keyword from a street name for DB candidate search.
 * Strips leading directional words (West/East/North/South/W/E/N/S) and trailing
 * type suffixes (Avenue/Road/Street/etc.) so the DB LIKE uses only the specific
 * part of the name: "West 49th Avenue" → "49th", "Lillooet Road" → "Lillooet".
 */
function extractStreetKeyword(street: string): string {
  const directions = new Set(['west','east','north','south','w','e','n','s'])
  const typeSuffixes = new Set([
    'avenue','ave','road','rd','street','st','drive','dr',
    'boulevard','blvd','court','ct','place','pl','crescent','cres',
    'way','lane','ln','terrace','ter','trail','highway','hwy',
  ])
  const parts = street.trim().split(/\s+/)
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (directions.has(lower) || typeSuffixes.has(lower)) continue
    return part   // keep "49th", "7th" etc. — MySQL LIKE is case-insensitive
  }
  return parts[0] ?? street
}

function getClient(): Anthropic {
  const integrationBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
  const integrationApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY
  const directApiKey = process.env.ANTHROPIC_API_KEY
  const opts: ConstructorParameters<typeof Anthropic>[0] = integrationBaseUrl
    ? { baseURL: integrationBaseUrl, apiKey: integrationApiKey ?? 'dummy' }
    : { apiKey: directApiKey }
  return new Anthropic(opts)
}

async function callClaude(userPrompt: string, maxTokens: number): Promise<string> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system: 'You are a real estate address normalizer and MLS matching assistant for Greater Vancouver, BC, Canada. You respond with valid JSON only — no prose, no code fences.',
    messages: [{ role: 'user', content: userPrompt }],
  })
  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '[]'
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

interface NormalizedAddress {
  raw: string
  unit: string | null
  street_no: string
  street: string
  city: string
  is_private_sale: boolean
}

interface Candidate {
  mls_id: string
  address: string
  city: string
  sold_price: number | null
  sold_date: string | null
}

interface MatchResult {
  raw: string
  normalized: NormalizedAddress | null
  mls_id: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  reason: string
  candidate: Candidate | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: _agentId } = await params

  let body: { addresses?: string[] } = {}
  try { body = await req.json() } catch {}

  const rawAddresses = (body.addresses || []).map(a => a.trim()).filter(Boolean)
  if (!rawAddresses.length) {
    return NextResponse.json({ error: 'addresses array required' }, { status: 400 })
  }

  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'No AI API key configured. Set ANTHROPIC_API_KEY in environment secrets.' }, { status: 500 })
  }

  // ── Step 1: Claude batch normalize all addresses ──────────────────────────
  const normalizePrompt = `You are a real estate address parser for Metro Vancouver, BC, Canada.

Given the raw address list below, return a JSON array where each element corresponds to one input address (in the same order):
{
  "raw": "<original line>",
  "unit": "<unit number or null>",
  "street_no": "<street number>",
  "street": "<full street name with proper type suffix e.g. 'Lansdowne Road', 'West 40th Avenue', 'East Pender Street'>",
  "city": "<city name — default to Vancouver if missing>",
  "is_private_sale": <true if the address notes it is a private sale, false otherwise>
}

Rules:
- Expand abbreviations: "Van" or "van" → "Vancouver", "North van" → "North Vancouver", "Burnaby" stays "Burnaby"
- Expand ordinal streets: "west 13" → "West 13th Avenue", "east 10" → "East 10th Avenue", "west 40 th ave" → "West 40th Avenue"
- Fix obvious typos: "Pkace" → "Place"
- Strip private-sale notes like "(private sale)" from the address and set is_private_sale=true
- For "3837 Cambridge" with no city, default city to Vancouver
- Respond with ONLY the JSON array, no other text

Raw addresses:
${rawAddresses.map((a, i) => `${i + 1}. ${a}`).join('\n')}`

  let normalized: NormalizedAddress[] = []
  try {
    const raw = await callClaude(normalizePrompt, 3000)
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      normalized = parsed as NormalizedAddress[]
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'AI normalization failed', detail: msg }, { status: 500 })
  }

  // Pad / align normalized array with raw addresses
  while (normalized.length < rawAddresses.length) {
    normalized.push({ raw: rawAddresses[normalized.length], unit: null, street_no: '', street: '', city: 'Vancouver', is_private_sale: false })
  }

  // ── Step 2: Laravel candidate fetch (parallel for all addresses) ──────────
  const candidateFetches = normalized.map(async (n): Promise<Candidate[]> => {
    if (n.is_private_sale) return []
    if (!n.street_no && !n.street) return []
    try {
      const params = new URLSearchParams()
      if (n.street_no) params.set('street_no', n.street_no)
      if (n.street) params.set('street', extractStreetKeyword(n.street))
      if (n.city) params.set('city', n.city)
      const res = await laravelAdminFetch(`/buyer-solds/candidates?${params.toString()}`, {
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.candidates || []) as Candidate[]
    } catch {
      return []
    }
  })

  const allCandidates = await Promise.all(candidateFetches)

  // ── Step 3: Claude pick best match per address (batched) ──────────────────
  const itemsForMatching = normalized.map((n, i) => ({
    index: i,
    raw: n.raw,
    normalized: n,
    candidates: allCandidates[i],
  }))

  const matchPrompt = `You are a real estate MLS matching assistant for Greater Vancouver, BC, Canada.

For each entry below, select the best matching MLS candidate (if any). Return a JSON array (one element per entry, same order):
{
  "index": <same index from input>,
  "mls_id": "<best matching mls_id, or null if no good match>",
  "confidence": "high" | "medium" | "low" | "none",
  "reason": "<brief explanation — mention address, sold price, sold date>"
}

Confidence guide:
- "high": unit + street number + street name + city all match
- "medium": street number + street name match, unit may differ slightly
- "low": only street name matches, address details uncertain
- "none": no candidates, private sale, or no meaningful match

If is_private_sale is true, always return mls_id=null, confidence="none", reason="Private sale — no MLS record expected."

Entries:
${JSON.stringify(itemsForMatching.map(item => ({
  index: item.index,
  raw: item.raw,
  normalized: item.normalized,
  candidates: item.candidates,
})), null, 2)}`

  let matchResults: Array<{ index: number; mls_id: string | null; confidence: 'high' | 'medium' | 'low' | 'none'; reason: string }> = []
  try {
    const raw = await callClaude(matchPrompt, 2000)
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      matchResults = parsed
    }
  } catch {
    matchResults = normalized.map((_, i) => ({ index: i, mls_id: null, confidence: 'none' as const, reason: 'AI matching failed' }))
  }

  // ── Step 4: Assemble final result ─────────────────────────────────────────
  const results: MatchResult[] = normalized.map((n, i) => {
    const match = matchResults.find(m => m.index === i) ?? { mls_id: null, confidence: 'none' as const, reason: '' }
    const candidates = allCandidates[i]
    const chosenCandidate = match.mls_id
      ? (candidates.find(c => c.mls_id === match.mls_id) ?? null)
      : null

    return {
      raw: n.raw,
      normalized: n,
      mls_id: match.mls_id,
      confidence: match.confidence,
      reason: match.reason,
      candidate: chosenCandidate,
    }
  })

  return NextResponse.json({ results })
}
