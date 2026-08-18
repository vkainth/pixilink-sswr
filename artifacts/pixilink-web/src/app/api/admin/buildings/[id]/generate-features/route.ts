import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/admin-auth'
import Anthropic from '@anthropic-ai/sdk'
import { fetchRetryingOn429 } from '@/lib/admin-retry'

export const maxDuration = 300

const BASE_CONSTRAINTS = `LANGUAGE & SPELLING (Canadian English throughout):
- Spelling: neighbourhood, storey, centre, colour, favourite, licence (noun), organise
- Prices always in CAD context
- Geography: use Metro Vancouver, Lower Mainland, Fraser Valley, Sea-to-Sky Corridor as appropriate
- Refer to suites not units where natural; storeys not floors/stories

TONE:
- Warm, informative, and factual — like a knowledgeable local agent, not an ad copywriter
- No superlatives or hype words: avoid "stunning", "luxurious", "prestigious", "world-class", "breathtaking", "exceptional", "spectacular", "remarkable", "resort-style"
- Write directly and concisely — BC buyers are skeptical of marketing language
- Be accurate: only describe what is supported by the source data provided — never invent claims

You must respond with valid JSON only — no prose before or after the JSON array.`

const DEFAULT_SYSTEM_PROMPT = `You are a real estate content writer for a Canadian real estate website covering Metro Vancouver and the Lower Mainland of British Columbia.

${BASE_CONSTRAINTS}`

export type FeatureSection = { title: string; items: string[] }
export type WebSource = { title: string; url: string }
export type FeaturesPayload =
  | { type: 'plain'; sections: FeatureSection[] }
  | { type: 'ai_generated'; sections: FeatureSection[] }
  | { type: 'web_sourced'; sections: FeatureSection[] }

function isHtmlItem(s: string): boolean {
  return /<[a-z]/i.test(s)
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function parseSectionsFromRaw(items: string[]): FeatureSection[] {
  const sections: FeatureSection[] = []
  let currentTitle = 'Features'
  let currentItems: string[] = []

  for (const item of items) {
    const strongMatch = item.match(/<strong>(.*?)<\/strong>/i)
    if (strongMatch) {
      if (currentItems.length > 0) {
        sections.push({ title: currentTitle, items: currentItems })
      }
      currentTitle = stripHtml(strongMatch[1]).trim() || 'Features'
      currentItems = []
      const rest = item.replace(/<strong>.*?<\/strong>/i, '')
      const restClean = stripHtml(rest).trim()
      if (restClean) currentItems.push(restClean)
    } else {
      const clean = stripHtml(item).trim()
      if (clean) currentItems.push(clean)
    }
  }

  if (currentItems.length > 0) {
    sections.push({ title: currentTitle, items: currentItems })
  }

  return sections
}

// ── Web search fallback via Anthropic web_search tool ─────────────────────────
async function webSearchForBuilding(
  client: Anthropic,
  name: string,
  city: string,
  subarea: string,
): Promise<{ sections: FeatureSection[]; sources: WebSource[] } | null> {
  const location = [subarea, city].filter(Boolean).join(', ')

  const userPrompt = `Search the web for the "${name}" condo building in ${location}, BC, Canada. Find its amenities, suite finishes, and building features — things like parking, storage, appliances, flooring, common areas, and building services.

After searching, format what you find as a JSON array only:
[{"title": "Section Name", "items": ["Feature one.", "Feature two."]}]

Rules:
- Use Canadian English spelling (neighbourhood, storey, centre)
- Section titles should be functional categories (e.g. "Suite Features", "Amenities", "Parking & Storage")
- Only include features you actually found in search results — never invent or guess
- If you find nothing useful, return []
- Return ONLY the JSON array, no commentary, no markdown`

  const sources: WebSource[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientAny = client as any
  type MsgParam = { role: 'user' | 'assistant'; content: unknown }
  const messages: MsgParam[] = [{ role: 'user', content: userPrompt }]

  for (let turn = 0; turn < 1; turn++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createParams: Record<string, unknown> = {
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    }
    const resp = await clientAny.messages.create(createParams)

    // Collect source URLs from web_search_tool_result blocks
    for (const block of (resp.content || [])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any
      if (b.type === 'web_search_tool_result') {
        for (const r of (b.content || [])) {
          if (r.type === 'web_search_result' && r.url && !sources.some(s => s.url === r.url)) {
            sources.push({ title: r.title || r.url, url: r.url })
          }
        }
      }
    }

    // If done, parse the final text block as JSON
    if (resp.stop_reason !== 'tool_use') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalText = (resp.content || [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => (c.text || '') as string)
        .join('\n')
        .trim()

      if (!finalText) return null
      const jsonText = finalText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      try {
        const parsed = JSON.parse(jsonText)
        if (!Array.isArray(parsed) || parsed.length === 0) return null
        return { sections: parsed as FeatureSection[], sources }
      } catch {
        return null
      }
    }

    // Continue the loop — pass tool_use blocks back with any associated results
    messages.push({ role: 'assistant', content: resp.content })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolResults: any[] = []
    for (const block of (resp.content || [])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any
      if (b.type === 'tool_use' && b.name === 'web_search') {
        // Find associated result block that Anthropic may have returned in same response
        const resultBlock = (resp.content || []).find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.type === 'web_search_tool_result' && c.tool_use_id === b.id
        ) as any
        toolResults.push({
          type: 'tool_result',
          tool_use_id: b.id,
          content: resultBlock?.content || [],
        })
      }
    }

    if (toolResults.length === 0) break
    messages.push({ role: 'user', content: toolResults })
  }

  return null
}

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

  const LARAVEL_URL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
  const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

  const laravelHeaders: Record<string, string> = {
    Accept: 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) laravelHeaders['Host'] = LARAVEL_HOST

  try {
    const body = await req.json()
    const {
      systemPrompt: customSystemPrompt,
      agentSlug,
      slug: buildingSlug,
      name: bodyName,
      city: bodyCity,
      subarea: bodySubarea,
      strata_no: bodyStrataNo,
      dryRun = false,
      // Skip-if-exists guard — pass force: true to overwrite existing content
      force = false,
    } = body as {
      systemPrompt?: string
      agentSlug?: string
      slug?: string
      name?: string
      city?: string
      subarea?: string
      strata_no?: string
      dryRun?: boolean
      force?: boolean
    }

    // ── Fetch building detail to get raw BCN features + metadata ──────────
    let rawFeatures: string[] = []
    let name = (bodyName || '').trim()
    let city = bodyCity || ''
    let subarea = bodySubarea || ''
    let fetchedStrataNo = ''
    let existingFeaturesData: { type?: string } | null = null

    if (agentSlug && buildingSlug) {
      try {
        const detailRes = await fetch(
          `${LARAVEL_URL}/api-internal/agent/${agentSlug}/building/${buildingSlug}`,
          { headers: laravelHeaders, cache: 'no-store' }
        )
        if (detailRes.ok) {
          const d = await detailRes.json()
          if (d && d.id) {
            if (Array.isArray(d.features) && d.features.length > 0) {
              rawFeatures = (d.features as unknown[])
                .filter((f): f is string => typeof f === 'string' && f.trim() !== '')
            }
            if (!name && d.name) name = String(d.name).trim()
            if (!city && d.city) city = String(d.city)
            if (!subarea && d.subarea) subarea = String(d.subarea)
            if (!name && d.strata_no) fetchedStrataNo = String(d.strata_no).trim()
            // Capture existing AI features for the skip guard
            if (d.features_data && typeof d.features_data === 'object' && d.features_data.type) {
              existingFeaturesData = d.features_data as { type?: string }
            }
          }
        }
      } catch {}
    }

    // ── Skip-if-exists guard ──────────────────────────────────────────────
    // If the building already has AI features and the caller didn't pass force:true,
    // return a skipped response so the batch runner marks it done without a Claude call.
    if (!force && !dryRun && existingFeaturesData && existingFeaturesData.type) {
      return NextResponse.json({ id: Number(id), skipped: true, reason: 'already_has_content' })
    }

    if (!name) {
      const strataNo = fetchedStrataNo || (bodyStrataNo || '').trim()
      if (strataNo) {
        name = `Strata ${strataNo}`
      } else {
        return NextResponse.json({ error: 'Building name is required' }, { status: 400 })
      }
    }

    // ── Build Anthropic client (shared for BCN rewrite + web fallback) ─────
    const hasAnthropicAccess = !!(integrationBaseUrl || directApiKey)

    // ── Web search fallback when BCN has no features ───────────────────────
    if (rawFeatures.length === 0) {
      if (!hasAnthropicAccess) {
        return NextResponse.json(
          { error: 'No BCN features found and ANTHROPIC_API_KEY is not configured for web search fallback.' },
          { status: 422 }
        )
      }

      const clientOptions: ConstructorParameters<typeof Anthropic>[0] = integrationBaseUrl
        ? { baseURL: integrationBaseUrl, apiKey: integrationApiKey ?? 'dummy' }
        : { apiKey: directApiKey }
      const client = new Anthropic(clientOptions)

      let webResult: { sections: FeatureSection[]; sources: WebSource[] } | null = null
      try {
        webResult = await webSearchForBuilding(client, name, city, subarea)
      } catch (webErr) {
        const msg = webErr instanceof Error ? webErr.message : String(webErr)
        return NextResponse.json(
          { error: `Web search failed: ${msg.slice(0, 200)}` },
          { status: 500 }
        )
      }

      if (!webResult || webResult.sections.length === 0) {
        return NextResponse.json({
          id: Number(id),
          saved: false,
          webFallback: true,
          insufficient: true,
        })
      }

      const payload: FeaturesPayload = { type: 'web_sourced', sections: webResult.sections }

      // Web-sourced features always require explicit review — never auto-save
      if (!dryRun) {
        const saveRes = await fetchRetryingOn429(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/features`, {
          method: 'POST',
          headers: { ...laravelHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ features_json: JSON.stringify(payload) }),
        })
        if (!saveRes.ok) {
          const errText = await saveRes.text().catch(() => `HTTP ${saveRes.status}`)
          return NextResponse.json(
            { error: `Generated OK but save to database failed: ${errText.slice(0, 300)}` },
            { status: 500 }
          )
        }
        if (agentSlug && buildingSlug) {
          revalidatePath(`/agent/${agentSlug}/building/${buildingSlug}`)
        }
      }

      return NextResponse.json({
        id: Number(id),
        saved: !dryRun,
        webFallback: true,
        sources: webResult.sources,
        ...payload,
      })
    }

    // ── Detect plain-tag vs sectioned HTML ────────────────────────────────
    const hasHtml = rawFeatures.some(isHtmlItem)

    let payload: FeaturesPayload

    if (!hasHtml) {
      const cleanItems = rawFeatures.map(s => s.trim()).filter(Boolean)
      payload = {
        type: 'plain',
        sections: [{ title: 'Features', items: cleanItems }],
      }
    } else {
      if (!hasAnthropicAccess) {
        return NextResponse.json(
          { error: 'ANTHROPIC_API_KEY is not configured. Set it in the environment to enable AI generation.' },
          { status: 503 }
        )
      }

      const parsedSections = parseSectionsFromRaw(rawFeatures)

      const sectionList = parsedSections
        .map(s => `### ${s.title}\n${s.items.map(i => `- ${i}`).join('\n')}`)
        .join('\n\n')

      const systemPromptText = customSystemPrompt
        ? `${customSystemPrompt.trim()}\n\n${BASE_CONSTRAINTS}`
        : DEFAULT_SYSTEM_PROMPT

      const userPrompt = `Rewrite the building feature bullets below for ${name} in ${subarea || city}, BC. Return a JSON array of section objects: [{ "title": string, "items": string[] }].

RULES:
- Rewrite each bullet in original Canadian English — do not copy source wording verbatim (it is copyrighted)
- Preserve all factual claims: appliance brands, materials, dimensions, named amenities
- Consolidate section titles into neutral functional categories (e.g. "Exterior & Arrival", "Interior Finishes", "Kitchen", "Bathrooms", "Peace of Mind", "Amenities")
- One sentence per bullet, max 20 bullets total across all sections
- No hype words, no marketing language — factual and direct
- This is a RESIDENTIAL strata website — omit any features specific to commercial retail units (CRUs), retail parking stalls, commercial electrical service (three-phase/CRU power), or commercial HVAC specs
- Return ONLY the JSON array, no markdown, no commentary

SOURCE FEATURES:
${sectionList}

OUTPUT FORMAT (JSON array, no markdown):
[
  {
    "title": "Section Name",
    "items": ["Rewritten bullet one.", "Rewritten bullet two."]
  }
]`

      const clientOptions: ConstructorParameters<typeof Anthropic>[0] = integrationBaseUrl
        ? { baseURL: integrationBaseUrl, apiKey: integrationApiKey ?? 'dummy' }
        : { apiKey: directApiKey }

      const client = new Anthropic(clientOptions)

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPromptText,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const rawText = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
      if (!rawText) {
        return NextResponse.json({ error: 'Claude returned empty response' }, { status: 500 })
      }

      let sections: FeatureSection[]
      try {
        const jsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
        const parsed = JSON.parse(jsonText)
        if (!Array.isArray(parsed)) throw new Error('Expected JSON array')
        sections = parsed as FeatureSection[]
      } catch {
        return NextResponse.json(
          { error: `Failed to parse Claude response as JSON: ${rawText.slice(0, 200)}` },
          { status: 500 }
        )
      }

      payload = { type: 'ai_generated', sections }
    }

    // ── Save to Laravel (skipped in dryRun mode) ──────────────────────────
    if (!dryRun) {
      const saveRes = await fetchRetryingOn429(`${LARAVEL_URL}/api-internal/admin/buildings/${id}/features`, {
        method: 'POST',
        headers: { ...laravelHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ features_json: JSON.stringify(payload) }),
      })
      if (!saveRes.ok) {
        const errText = await saveRes.text().catch(() => `HTTP ${saveRes.status}`)
        return NextResponse.json(
          { error: `Generated OK but save to database failed: ${errText.slice(0, 300)}` },
          { status: 500 }
        )
      }
      if (agentSlug && buildingSlug) {
        revalidatePath(`/agent/${agentSlug}/building/${buildingSlug}`)
      }
    }

    return NextResponse.json({ id: Number(id), saved: !dryRun, ...payload })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
