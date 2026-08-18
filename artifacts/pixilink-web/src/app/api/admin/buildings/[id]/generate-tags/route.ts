import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { PERSONAS } from '@/lib/personas'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRetryingOn429 } from '@/lib/admin-retry'

export const maxDuration = 120

const ALL_PERSONA_TAGS = Array.from(new Set(Object.values(PERSONAS).flatMap(p => p.tags)))

const SYSTEM_PROMPT = `You are a real estate data analyst tagging strata buildings for a Canadian real estate website in Metro Vancouver / the Lower Mainland of British Columbia.

Your job is to read a building's description, amenities, and feature bullets, and decide which of a fixed set of persona tags genuinely apply — based ONLY on evidence in the text. Never guess or infer a tag that isn't clearly supported.

You must respond with valid JSON only — no prose before or after the JSON object.`

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
      { error: 'ANTHROPIC_API_KEY is not configured. Set it in the environment to enable AI tagging.' },
      { status: 503 }
    )
  }

  const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

  // Agent endpoints (building detail fetch) need LARAVEL_API_HOST (website.pixilink.com)
  // for correct routing — agent routes are domain-scoped.
  const agentHost = process.env.LARAVEL_API_HOST || null
  const agentHeaders: Record<string, string> = { Accept: 'application/json', 'X-Admin-Secret': ADMIN_SECRET }
  if (agentHost) agentHeaders['Host'] = agentHost

  // Admin endpoints (tag save) must NOT use website.pixilink.com — that host triggers a
  // redirect in Laravel and the save silently fails. Use ADMIN_LARAVEL_HOST if set,
  // otherwise send no Host override (PHP-FPM default vhost handles admin routes correctly).
  const adminHost = process.env.ADMIN_LARAVEL_HOST ?? null
  const adminHeaders: Record<string, string> = { Accept: 'application/json', 'X-Admin-Secret': ADMIN_SECRET, 'Content-Type': 'application/json' }
  if (adminHost) adminHeaders['Host'] = adminHost

  try {
    const body = await req.json()
    const {
      agentSlug,
      slug: buildingSlug,
      // Building fields passed directly from the batch page (used as a fallback if detail fetch fails)
      name: bodyName,
      units: bodyUnits,
      levels: bodyLevels,
      no_pets: bodyNoPets,
      existingTags,
      force = false,
    } = body as {
      agentSlug?: string
      slug?: string
      name?: string
      units?: number | null
      levels?: number | null
      no_pets?: boolean
      existingTags?: string[]
      force?: boolean
    }

    if (!force && Array.isArray(existingTags) && existingTags.length > 0) {
      return NextResponse.json({ id: Number(id), tags: existingTags, skipped: true, reason: 'already_has_tags' })
    }

    // ── Fetch full building detail for richer tagging context ────────────
    let description = ''
    let amenities: string[] = []
    let features: string[] = []
    let units = bodyUnits ?? null
    let levels = bodyLevels ?? null
    let no_pets = bodyNoPets ?? false
    let dogs_allowed = false
    let cats_allowed = false
    let mgmt_name = ''
    let name = bodyName || ''

    if (agentSlug && buildingSlug) {
      try {
        const detailRes = await fetch(
          `${LARAVEL_URL}/api-internal/agent/${agentSlug}/building/${buildingSlug}`,
          { headers: agentHeaders, cache: 'no-store' }
        )
        if (detailRes.ok) {
          const d = await detailRes.json()
          if (d && d.id) {
            description = d.description || ''
            amenities = Array.isArray(d.amenities) ? d.amenities : []
            if (Array.isArray(d.features)) features = d.features.filter((f: unknown): f is string => typeof f === 'string')
            units = d.units ?? units
            levels = d.levels ?? levels
            no_pets = d.no_pets ?? no_pets
            dogs_allowed = d.dogs_allowed ?? false
            cats_allowed = d.cats_allowed ?? false
            mgmt_name = d.mgmt_name || ''
            name = d.name || name
          }
        }
      } catch {}
    }

    const sourceText = [
      description && `Description: ${description}`,
      amenities.length > 0 && `Amenities: ${amenities.join(', ')}`,
      features.length > 0 && `Features: ${features.join('; ')}`,
      units != null && `Suites: ${units}`,
      levels != null && `Storeys: ${levels}`,
      `Pet Policy: ${no_pets ? 'No pets permitted' : [dogs_allowed && 'dogs allowed', cats_allowed && 'cats allowed'].filter(Boolean).join(', ') || 'not specified'}`,
      mgmt_name && `Strata Management: ${mgmt_name}`,
    ].filter(Boolean).join('\n')

    if (!description && amenities.length === 0 && features.length === 0) {
      return NextResponse.json({ id: Number(id), tags: [], saved: false, reason: 'no_source_text' })
    }

    const userPrompt = `Read the building data below for "${name}" and decide which of these persona tags genuinely apply. Only include a tag if there is clear evidence for it — do not guess.

AVAILABLE TAGS (use only these exact strings — buildings should only ever qualify for downsizer-related and luxury/appliance tags, use whichever genuinely apply):
${ALL_PERSONA_TAGS.map(t => `- ${t}`).join('\n')}

TAG GUIDANCE:
- elevator: building explicitly has elevator access (typical for any building over 3 storeys, but only tag if evidenced or storeys >= 4)
- one-level-living: building is a single-storey/rancher-style development, OR amenities explicitly describe single-level suites
- age-55-plus: explicitly an age-restricted 55+ or adult-oriented building
- low-strata-fee: strata fee explicitly called out as low
- small-complex: explicitly small/boutique building, or suite count under ~20
- pet-friendly: dogs or cats explicitly allowed
- luxury-finishes / custom-millwork / spa-ensuite / high-end-renovation / designer-kitchen: general high-end finish claims in the description or amenities
- high-end-appliances / sub-zero / wolf / viking / miele / thermador / fisher-paykel / bosch: ONLY if that exact brand or "high-end appliances" phrasing appears in the text

BUILDING DATA:
${sourceText}

Respond with a JSON object: { "tags": ["tag-one", "tag-two"] }
If no tags apply, respond with { "tags": [] }.`

    const clientOptions: ConstructorParameters<typeof Anthropic>[0] = integrationBaseUrl
      ? { baseURL: integrationBaseUrl, apiKey: integrationApiKey ?? 'dummy' }
      : { apiKey: directApiKey }

    const client = new Anthropic(clientOptions)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    if (!rawText) {
      return NextResponse.json({ error: 'Claude returned empty response' }, { status: 500 })
    }

    let parsed: { tags?: string[] }
    try {
      const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: `Failed to parse Claude response as JSON: ${rawText.slice(0, 200)}` }, { status: 500 })
    }

    const tags = (Array.isArray(parsed.tags) ? parsed.tags : []).filter(t => ALL_PERSONA_TAGS.includes(t))

    const saveRes = await fetchRetryingOn429(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/tags`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ tags }),
    })
    if (!saveRes.ok) {
      const errText = await saveRes.text().catch(() => `HTTP ${saveRes.status}`)
      return NextResponse.json(
        { error: `Generated OK but save to database failed: ${errText.slice(0, 300)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: Number(id), tags, saved: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
