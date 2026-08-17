import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { PERSONAS } from '@/lib/personas'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const ALL_PERSONA_TAGS = Array.from(new Set(Object.values(PERSONAS).flatMap(p => p.tags)))

const SYSTEM_PROMPT = `You are a real estate data analyst tagging MLS listings for a Canadian real estate website in Metro Vancouver / the Lower Mainland of British Columbia.

Your job is to read a listing's remarks, features, and amenities, and decide which of a fixed set of persona tags genuinely apply — based ONLY on evidence in the text. Never guess or infer a tag that isn't clearly supported.

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

  // Admin endpoints must NOT use LARAVEL_API_HOST (website.pixilink.com) — that host
  // triggers a Laravel redirect, returning HTML instead of JSON and silently failing saves.
  // Use ADMIN_LARAVEL_HOST if explicitly set; otherwise send no Host override.
  const adminHost = process.env.ADMIN_LARAVEL_HOST ?? null
  const adminHeaders: Record<string, string> = { Accept: 'application/json', 'X-Admin-Secret': ADMIN_SECRET, 'Content-Type': 'application/json' }
  if (adminHost) adminHeaders['Host'] = adminHost

  try {
    const body = await req.json()
    const {
      remarks: bodyRemarks,
      features: bodyFeatures,
      amenity: bodyAmenity,
      // Skip-if-exists guard — pass force: true to overwrite existing tags
      existingTags,
      force = false,
    } = body as {
      remarks?: string
      features?: string
      amenity?: string
      existingTags?: string[]
      force?: boolean
    }

    // Skip-if-exists guard — the batch page passes existingTags from its loaded queue.
    if (!force && Array.isArray(existingTags) && existingTags.length > 0) {
      return NextResponse.json({ id: Number(id), tags: existingTags, skipped: true, reason: 'already_has_tags' })
    }

    const remarks = (bodyRemarks || '').trim()
    const features = (bodyFeatures || '').trim()
    const amenity = (bodyAmenity || '').trim()

    if (!remarks && !features && !amenity) {
      // Nothing to analyze — this is a legitimate "no tags" outcome, not an error.
      return NextResponse.json({ id: Number(id), tags: [], saved: false, reason: 'no_source_text' })
    }

    const userPrompt = `Read the listing text below and decide which of these persona tags genuinely apply. Only include a tag if there is clear textual evidence for it — do not guess.

AVAILABLE TAGS (use only these exact strings):
${ALL_PERSONA_TAGS.map(t => `- ${t}`).join('\n')}

TAG GUIDANCE:
- elevator: building/unit explicitly has elevator access
- one-level-living: single-storey home, rancher, or ground-floor/no-stairs unit
- age-55-plus: explicitly an age-restricted 55+ or adult-oriented building
- low-strata-fee: strata fee is explicitly called out as low, or a specific low dollar amount is mentioned relative to a condo/townhouse
- small-complex: explicitly described as a small, boutique, or low-rise complex with few units
- pet-friendly: pets/dogs/cats explicitly allowed
- luxury-finishes: general high-end finishing described (not appliance-specific)
- custom-millwork: custom cabinetry, built-ins, coffered ceilings, detailed trim
- spa-ensuite: spa-like primary bathroom, soaker tub, rain shower, heated floors
- high-end-renovation: extensive/full renovation described using premium materials
- designer-kitchen: designer or chef's kitchen with premium countertops/cabinetry
- high-end-appliances: premium appliance package mentioned generically
- sub-zero / wolf / viking / miele / thermador / fisher-paykel / bosch: ONLY if that exact brand name appears in the text

LISTING TEXT:
Remarks: ${remarks || '(none)'}
Features: ${features || '(none)'}
Amenities: ${amenity || '(none)'}

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

    // Defense in depth: only ever keep tags from the fixed allowlist, even if Claude drifts.
    const tags = (Array.isArray(parsed.tags) ? parsed.tags : []).filter(t => ALL_PERSONA_TAGS.includes(t))

    const saveRes = await fetch(`${LARAVEL_URL}/api-internal/admin/listings/${id}/tags`, {
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
