import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/admin-auth'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRetryingOn429 } from '@/lib/admin-retry'

export const maxDuration = 300

const BASE_CONSTRAINTS = `LANGUAGE & SPELLING (Canadian English throughout):
- Spelling: neighbourhood, storey, centre, colour, favourite, licence (noun), organise
- Prices always in CAD context (e.g. "$850,000" is understood as CAD)
- Geography: use Metro Vancouver, Lower Mainland, Fraser Valley, Sea-to-Sky Corridor as appropriate
- Refer to suites not units where natural; storeys not floors/stories

TONE:
- Warm, informative, and factual — like a knowledgeable local agent, not an ad copywriter
- No superlatives or hype words: avoid "stunning", "luxurious", "prestigious", "world-class", "breathtaking", "exceptional", "spectacular", "remarkable"
- Write directly and concisely — BC buyers are skeptical of marketing language
- Be accurate: only describe what is supported by the data provided

You must respond with valid JSON only — no prose before or after the JSON object.`

const DEFAULT_SYSTEM_PROMPT = `You are a real estate content writer for a Canadian real estate website covering Metro Vancouver and the Lower Mainland of British Columbia.

${BASE_CONSTRAINTS}`

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await getAdminSession()
  } catch {}
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params

  const integrationBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
  const integrationApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY
  const directApiKey = process.env.ANTHROPIC_API_KEY

  if (!integrationBaseUrl && !directApiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Set it in the environment to enable AI generation.' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const {
      // Prompt override from UI
      systemPrompt: customSystemPrompt,
      // Agent/building identity for fetching full detail
      agentSlug,
      slug: buildingSlug,
      // Building fields passed directly from batch page
      name: bodyName,
      city: bodyCity,
      subarea: bodySubarea,
      units: bodyUnits,
      year_built: bodyYearBuilt,
      construction: bodyConstruction,
      levels: bodyLevels,
      strata_no: bodyStrataNo,
      active_count: bodyActiveCount,
      active_min_price: bodyMinPrice,
      active_max_price: bodyMaxPrice,
      // Skip-if-exists guard — pass force: true to overwrite existing content
      force = false,
    } = body as {
      systemPrompt?: string
      agentSlug?: string
      slug?: string
      name?: string
      city?: string
      subarea?: string
      units?: number
      year_built?: number | null
      construction?: string
      levels?: number
      strata_no?: string
      active_count?: number
      active_min_price?: number | null
      active_max_price?: number | null
      force?: boolean
    }

    // ── Attempt to fetch full building detail from Laravel ────────────────
    const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
    const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
    const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

    const laravelHeaders: Record<string, string> = {
      Accept: 'application/json',
      'X-Admin-Secret': ADMIN_SECRET,
    }
    if (LARAVEL_HOST) laravelHeaders['Host'] = LARAVEL_HOST

    let richData: {
      name?: string; city?: string; subarea?: string; units?: number | null
      year_built?: number | null; construction?: string | null; levels?: number | null
      strata_no?: string | null; mgmt_name?: string | null; bylaw_restrictions?: string | null
      amenities?: string[]; no_pets?: boolean; dogs_allowed?: boolean; cats_allowed?: boolean
      maintenance_fee_includes?: string[]; address?: string
      tagline?: string | null
      description?: string | null
      active_listings?: unknown[]; stats?: { sold_count?: number | null; avg_sold_price?: number | null; avg_per_sqft?: number | null; avg_dom?: number | null } | null
    } = {}

    if (agentSlug && buildingSlug) {
      try {
        const detailRes = await fetch(
          `${LARAVEL_URL}/api-internal/agent/${agentSlug}/building/${buildingSlug}`,
          { headers: laravelHeaders, cache: 'no-store' }
        )
        if (detailRes.ok) {
          const d = await detailRes.json()
          if (d && d.id) richData = d
        }
      } catch {}
    }

    // ── Skip-if-exists guard ──────────────────────────────────────────────
    // Only skip when the building already has BOTH a tagline and a description.
    // A building with only one of the two still needs generation.
    // The caller can pass force: true to bypass this guard and regenerate anyway.
    const hasTagline = !!(richData.tagline && richData.tagline.trim().length > 0)
    const hasDescription = !!(richData.description && richData.description.trim().length > 10)
    if (!force && hasTagline && hasDescription) {
      return NextResponse.json({ id: Number(id), skipped: true, reason: 'already_has_content' })
    }

    // Merge: rich data takes priority over body fields
    const rawName = (richData.name || bodyName || '').trim()
    const strata_no = richData.strata_no || bodyStrataNo || ''
    const name = rawName || (strata_no ? `Strata ${strata_no}` : '')
    if (!name) return NextResponse.json({ error: 'Building name is required' }, { status: 400 })

    const city = richData.city || bodyCity || ''
    const subarea = richData.subarea || bodySubarea || ''
    const units = richData.units ?? bodyUnits ?? null
    const year_built = richData.year_built ?? bodyYearBuilt ?? null
    const construction = richData.construction || bodyConstruction || ''
    const levels = richData.levels ?? bodyLevels ?? null
    const mgmt_name = richData.mgmt_name || ''
    const bylaw_restrictions = richData.bylaw_restrictions || ''
    const amenities: string[] = richData.amenities || []
    const no_pets = richData.no_pets ?? false
    const dogs_allowed = richData.dogs_allowed ?? false
    const cats_allowed = richData.cats_allowed ?? false
    const maint_fees_inc: string[] = richData.maintenance_fee_includes || []
    const address = richData.address || ''

    const activeListings = Array.isArray(richData.active_listings) ? richData.active_listings : []
    const active_count = bodyActiveCount ?? activeListings.length
    const active_min_price = bodyMinPrice ?? null
    const active_max_price = bodyMaxPrice ?? null
    const stats = richData.stats || null

    // ── Bedroom breakdown from active listings ────────────────────────────
    const bedsMap: Record<number, number> = {}
    if (activeListings.length > 0) {
      for (const l of activeListings as Array<{ beds?: number }>) {
        const b = l.beds ?? 0
        bedsMap[b] = (bedsMap[b] || 0) + 1
      }
    }
    const bedroom_breakdown = Object.keys(bedsMap).length > 0
      ? Object.entries(bedsMap).sort(([a], [b]) => Number(a) - Number(b))
          .map(([beds, count]) => `${count}× ${beds === '0' ? 'studio' : beds + '-bed'}`)
          .join(', ')
      : ''

    // ── Build prompt context ──────────────────────────────────────────────
    const petPolicy = no_pets
      ? 'No pets permitted by strata bylaws'
      : [dogs_allowed && 'dogs allowed', cats_allowed && 'cats allowed'].filter(Boolean).join(', ') || 'Pet policy not specified'

    const activeListingsInfo = active_count > 0
      ? `${active_count} active listing${active_count !== 1 ? 's' : ''}` +
        (active_min_price && active_max_price && active_min_price !== active_max_price
          ? `, priced from $${active_min_price.toLocaleString('en-CA')} to $${active_max_price.toLocaleString('en-CA')} CAD`
          : active_min_price
          ? `, priced at $${active_min_price.toLocaleString('en-CA')} CAD`
          : '')
      : 'No active listings currently'

    const soldInfo = stats?.avg_sold_price
      ? `Average sold price (last 12 months): $${Math.round(stats.avg_sold_price).toLocaleString('en-CA')} CAD` +
        (stats.avg_per_sqft ? `, avg $${Math.round(stats.avg_per_sqft).toLocaleString('en-CA')}/sq ft` : '') +
        (stats.avg_dom ? `, avg ${stats.avg_dom} days on market` : '') +
        (stats.sold_count ? ` (${stats.sold_count} sales)` : '')
      : 'No sold price data available'

    // ── System prompt: user-edited or default, always enforcing constraints
    const systemPromptText = customSystemPrompt
      ? `${customSystemPrompt.trim()}\n\n${BASE_CONSTRAINTS}`
      : DEFAULT_SYSTEM_PROMPT

    const userPrompt = `Generate SEO and AEO content for this BC strata building. Respond with a single JSON object with exactly these five keys: tagline, description, neighbourhood_context, meta_description, faq.

BUILDING DATA:
- Name: ${name}
- Full Address: ${address || `${city}${subarea ? `, ${subarea}` : ''}`}
- City: ${city || 'Not specified'}
- Subarea/Neighbourhood: ${subarea || 'Not specified'}
- Year Built: ${year_built || 'Not specified'}
- Storeys: ${levels || 'Not specified'}
- Suites in Development: ${units || 'Not specified'}
- Construction: ${construction || 'Not specified'}
- Strata Plan: ${strata_no || 'Not specified'}
- Strata Management: ${mgmt_name || 'Not specified'}
- Amenities: ${amenities.length ? amenities.join(', ') : 'Not listed'}
- Pet Policy: ${petPolicy}
- Bylaw Restrictions: ${bylaw_restrictions || 'Not specified'}
- Strata Fee Includes: ${maint_fees_inc.length ? maint_fees_inc.join(', ') : 'Not specified'}

MLS MARKET DATA (for FAQ answers only — do not use in description or tagline):
- Active Listings: ${activeListingsInfo}
- Bedroom Breakdown: ${bedroom_breakdown || 'Not available'}
- ${soldInfo}

REQUIRED OUTPUT (JSON object, no markdown):
{
  "tagline": "10-15 word factual one-liner about the building. No hype words.",
  "description": "150-200 word description written as a direct answer to 'What is ${name}?' for AEO. Naturally contains address, city, subarea, property type, year built, storeys, suites, amenities, pet policy. Canadian English throughout. Evergreen facts only — do NOT include any listing counts, asking prices, sold prices, price per square foot, or days on market. Those belong in the FAQ only.",
  "neighbourhood_context": "2-3 sentences about the surrounding area: walkability, transit, nearby parks/shops/schools as appropriate to ${subarea || city}. Factual and specific to Metro Vancouver/Lower Mainland geography.",
  "meta_description": "150-160 character meta description. Keyword-rich with building name, address, city, property type. Canadian English.",
  "faq": [
    Array of up to 10 objects with 'question' and 'answer' keys. Include only questions you have real data to answer. Answers must be factual, 1-3 sentences, Canadian English.
    Suggested question templates (use the actual building name):
    - 'What is ${name}?' — address, city, subarea, year built, suite count, property type
    - 'Is ${name} pet-friendly?' — no_pets, dogs/cats policy, bylaw_restrictions
    - 'When was ${name} built?' — yearbuilt, construction material
    - 'What amenities does ${name} have?' — amenities list (only if known)
    - 'What are the maintenance fees at ${name}?' — maint_fees_inc (only if known)
    - 'What suites are available at ${name}?' — active listings bedroom breakdown
    - 'What is the price range at ${name}?' — active listing min/max prices
    - 'What is the average sold price at ${name}?' — MLS sold stats
    - 'How many suites does ${name} have?' — units (only if known)
    - 'Where is ${name} located?' — full address, city, subarea, neighbourhood
  ]
}`

    const clientOptions: ConstructorParameters<typeof Anthropic>[0] = integrationBaseUrl
      ? { baseURL: integrationBaseUrl, apiKey: integrationApiKey ?? 'dummy' }
      : { apiKey: directApiKey }

    const client = new Anthropic(clientOptions)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPromptText,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    if (!rawText) {
      return NextResponse.json({ error: 'Claude returned empty response' }, { status: 500 })
    }

    let parsed: {
      tagline?: string
      description?: string
      neighbourhood_context?: string
      meta_description?: string
      faq?: Array<{ question: string; answer: string }>
    }
    try {
      const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: `Failed to parse Claude response as JSON: ${rawText.slice(0, 200)}` }, { status: 500 })
    }

    const tagline = parsed.tagline?.trim() ?? ''
    const description = parsed.description?.trim() ?? ''
    const neighbourhood_context = parsed.neighbourhood_context?.trim() ?? ''
    const meta_description = parsed.meta_description?.trim() ?? ''
    const faq = Array.isArray(parsed.faq) ? parsed.faq : []

    // Save all 5 fields to Laravel — must succeed before returning
    const saveRes = await fetchRetryingOn429(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/description`, {
      method: 'POST',
      headers: { ...laravelHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagline, description, neighbourhood_context, meta_description, faq_json: JSON.stringify(faq) }),
    })
    if (!saveRes.ok) {
      const errText = await saveRes.text().catch(() => `HTTP ${saveRes.status}`)
      return NextResponse.json(
        { error: `Generated OK but save to database failed: ${errText.slice(0, 300)}` },
        { status: 500 }
      )
    }

    // Bust Next.js page cache so "View on site" shows fresh content immediately
    if (agentSlug && buildingSlug) {
      revalidatePath(`/agent/${agentSlug}/building/${buildingSlug}`)
    }

    return NextResponse.json({ id: Number(id), tagline, description, neighbourhood_context, meta_description, faq })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
