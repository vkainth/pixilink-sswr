import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_INTERNAL_URL = process.env.LARAVEL_INTERNAL_URL || LARAVEL_URL
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

function laravelAdminHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

function laravelPublicHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

async function laravelAdminFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${LARAVEL_URL}/api-internal/admin${path}`, {
    ...opts,
    headers: { ...laravelAdminHeaders(), ...((opts.headers as Record<string, string>) || {}) },
  })
}

async function laravelPublicFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${LARAVEL_INTERNAL_URL}${path}`, {
    ...opts,
    headers: { ...laravelPublicHeaders(), ...((opts.headers as Record<string, string>) || {}) },
  })
}

const SYSTEM_PROMPT = `You are a real estate content writer for a Canadian real estate website covering Metro Vancouver and the Lower Mainland of British Columbia.

LANGUAGE & SPELLING (Canadian English throughout):
- Spelling: neighbourhood, storey, centre, colour, favourite, licence (noun), organise
- Prices always in CAD context
- Geography: use Metro Vancouver, Lower Mainland, Fraser Valley — never "the Pacific Northwest" alone
- Refer to suites not units where natural; storeys not floors/stories

TONE:
- Warm, informative, and factual — like a knowledgeable local agent, not an ad copywriter
- No hype words: avoid "stunning", "luxurious", "prestigious", "world-class", "breathtaking"
- Write directly and concisely — BC buyers are skeptical of marketing language
- Be accurate: only describe what is supported by the data provided

You must respond with valid JSON only — no prose before or after the JSON object.`

// Generation runs in Next.js rather than Laravel because the AI API key is
// scoped to this environment; Laravel only handles storage (save/list endpoints).
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
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  // Strip markdown code fences if Claude wrapped the JSON in ```json ... ``` or ``` ... ```
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

interface GeneratedPage {
  page_type: string
  slug: string
  title: string
  content: string
  meta_description: string
  subarea: string
}

interface NeighbourhoodStats {
  avg_sold_price?: number
  avg_dom?: number
  absorption_rate?: number
  active_count?: number
  sold_count?: number
  detached_pct?: number
  attached_pct?: number
  condo_pct?: number
}

async function fetchNeighbourhoodStats(agentSlug: string, subarea: string): Promise<NeighbourhoodStats | null> {
  try {
    const encoded = encodeURIComponent(subarea)
    const res = await laravelPublicFetch(`/api-internal/agent/${agentSlug}/neighbourhood/${encoded}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      avg_sold_price: data.avg_sold_price ?? data.stats?.avg_sold_price ?? undefined,
      avg_dom: data.avg_dom ?? data.stats?.avg_dom ?? undefined,
      absorption_rate: data.absorption_rate ?? data.stats?.absorption_rate ?? undefined,
      active_count: data.active_count ?? data.stats?.active_count ?? undefined,
      sold_count: data.sold_count ?? data.stats?.sold_count ?? undefined,
      detached_pct: data.detached_pct ?? data.stats?.detached_pct ?? undefined,
      attached_pct: data.attached_pct ?? data.stats?.attached_pct ?? undefined,
      condo_pct: data.condo_pct ?? data.stats?.condo_pct ?? undefined,
    }
  } catch {
    return null
  }
}

function formatStatsContext(stats: NeighbourhoodStats | null): string {
  if (!stats) return ''
  const lines: string[] = ['Current MLS market data for this neighbourhood (use these in your content — do not invent alternatives):']
  if (stats.avg_sold_price) lines.push(`- Average sold price: $${Math.round(stats.avg_sold_price).toLocaleString()}`)
  if (stats.avg_dom !== undefined) lines.push(`- Average days on market: ${Math.round(stats.avg_dom)} days`)
  if (stats.absorption_rate !== undefined) lines.push(`- Absorption rate: ${stats.absorption_rate.toFixed(1)}%`)
  if (stats.active_count !== undefined) lines.push(`- Active listings: ${stats.active_count}`)
  if (stats.sold_count !== undefined) lines.push(`- Recent solds (90 days): ${stats.sold_count}`)
  const typeParts: string[] = []
  if (stats.detached_pct) typeParts.push(`${Math.round(stats.detached_pct)}% detached`)
  if (stats.attached_pct) typeParts.push(`${Math.round(stats.attached_pct)}% attached/townhouse`)
  if (stats.condo_pct) typeParts.push(`${Math.round(stats.condo_pct)}% condo/apartment`)
  if (typeParts.length > 0) lines.push(`- Property type mix: ${typeParts.join(', ')}`)
  return lines.join('\n')
}

async function generateLifestylePage(
  agentName: string,
  brokerage: string,
  subarea: string,
  city: string,
  territories: string[],
): Promise<GeneratedPage> {
  const prompt = [
    `You are an SEO content writer for a real estate website. Write a comprehensive lifestyle guide page for the neighbourhood of ${subarea}, ${city}, BC, Canada.`,
    ``,
    `Agent context:`,
    `- Agent: ${agentName}${brokerage ? `, ${brokerage}` : ''}`,
    `- Territory cities: ${territories.join(', ')}`,
    `- This page is specifically about: ${subarea}`,
    ``,
    `Requirements:`,
    `- Length: 650–900 words of body content`,
    `- SEO-optimised: naturally include "${subarea} real estate", "${subarea} homes for sale", "living in ${subarea}" in the text`,
    `- Structure the content as HTML with exactly 4–5 H2 sections. Each H2 must be phrased as a question a buyer would ask. Use these exact question patterns (substituting the neighbourhood name):`,
    `  1. <h2>Who Lives in ${subarea}?</h2>`,
    `  2. <h2>What Are Homes Like in ${subarea}?</h2>`,
    `  3. <h2>What's the Lifestyle Like in ${subarea}?</h2>`,
    `  4. <h2>Why Do Buyers Choose ${subarea}?</h2>`,
    `  5. <h2>Working with ${agentName} in ${subarea}</h2>`,
    `- Each H2 must be followed by 1–2 <p> paragraphs answering that question directly`,
    `- Do NOT use bullet points, <ul>, <ol>, or any tags other than <h2> and <p>`,
    `- The content field must be valid HTML containing only <h2> and <p> tags`,
    `- Cover across all sections: neighbourhood character, lifestyle, community feel, who lives there, proximity to amenities, parks, shopping, dining, transit, housing types (condos, townhouses, detached homes)`,
    `- Conclude the last section with a paragraph mentioning ${agentName} as the local expert`,
    `- Tone: warm, informative, professional — like a trusted local guide`,
    `- Do NOT invent specific prices, specific school names (unless well known), or factual details you cannot verify`,
    ``,
    `Respond in this EXACT JSON format (no markdown, no code fence):`,
    `{"title":"...(55-65 chars)","meta_description":"...(145-160 chars)","content":"...(HTML with <h2> and <p> tags only)"}`,
  ].join('\n')

  const raw = await callClaude(prompt, 1800)
  let parsed: { title?: string; meta_description?: string; content?: string } = {}
  try { parsed = JSON.parse(raw) } catch { parsed = { title: `Living in ${subarea}`, content: raw, meta_description: '' } }

  return {
    page_type: 'lifestyle_seo',
    slug: `living-in-${toSlug(subarea)}`,
    title: parsed.title || `Living in ${subarea}, ${city} — Real Estate Guide`,
    content: parsed.content || '',
    meta_description: parsed.meta_description || `Discover ${subarea}, ${city} — lifestyle, real estate, and neighbourhood guide by ${agentName}.`,
    subarea,
  }
}

async function generateSchoolCatchmentPage(
  agentName: string,
  subarea: string,
  city: string,
): Promise<GeneratedPage> {
  const prompt = [
    `Write a school catchment and education guide for the neighbourhood of ${subarea}, ${city}, BC, Canada, for a real estate website.`,
    ``,
    `Requirements:`,
    `- Length: 500–700 words`,
    `- Cover: public school district (School District 36 Surrey or the appropriate local district), elementary and secondary schools serving the area, what families should know about catchments, private school options in the area, the school registration process overview`,
    `- Include a paragraph about the importance of school catchments for home buyers`,
    `- Note that buyers should always verify current catchment boundaries with the school district directly`,
    `- Tone: helpful, informative, parent-focused`,
    `- Do NOT invent specific school addresses, ratings, or test scores`,
    `- Naturally include "${subarea} schools", "${subarea} school catchment" for SEO`,
    ``,
    `Respond in this EXACT JSON format (no markdown, no code fence):`,
    `{"title":"...(50-65 chars)","meta_description":"...(145-160 chars)","content":"...(full body text)"}`,
  ].join('\n')

  const raw = await callClaude(prompt, 1400)
  let parsed: { title?: string; meta_description?: string; content?: string } = {}
  try { parsed = JSON.parse(raw) } catch { parsed = { title: `Schools in ${subarea}`, content: raw, meta_description: '' } }

  return {
    page_type: 'school_catchment',
    slug: `schools-in-${toSlug(subarea)}`,
    title: parsed.title || `Schools in ${subarea}, ${city} — Catchment Guide`,
    content: parsed.content || '',
    meta_description: parsed.meta_description || `School catchments and education guide for ${subarea}, ${city}. Find schools, catchment info and tips for families.`,
    subarea,
  }
}

async function generateAmenitiesPage(
  agentName: string,
  subarea: string,
  city: string,
): Promise<GeneratedPage> {
  const prompt = [
    `Write a walkability and amenities summary for the neighbourhood of ${subarea}, ${city}, BC, Canada, for a real estate website widget.`,
    ``,
    `Requirements:`,
    `- Length: 200–300 words (this is a compact widget, not a full page)`,
    `- Cover: walkability character, nearby parks and green space, transit access, shopping and grocery, dining and cafés, recreational facilities`,
    `- Tone: concise, upbeat, practical`,
    `- Do NOT invent specific business names, transit schedules, or walkability scores`,
    `- Naturally include "${subarea}" for context`,
    `- Write in 2-3 flowing paragraphs`,
    ``,
    `Respond in this EXACT JSON format (no markdown, no code fence):`,
    `{"title":"...(40-60 chars)","meta_description":"...(100-140 chars)","content":"...(2-3 paragraph summary)"}`,
  ].join('\n')

  const raw = await callClaude(prompt, 600)
  let parsed: { title?: string; meta_description?: string; content?: string } = {}
  try { parsed = JSON.parse(raw) } catch { parsed = { title: `${subarea} Amenities`, content: raw, meta_description: '' } }

  return {
    page_type: 'amenities',
    slug: `amenities-${toSlug(subarea)}`,
    title: parsed.title || `${subarea} Walkability & Amenities`,
    content: parsed.content || '',
    meta_description: parsed.meta_description || `Walkability, parks, transit and amenities in ${subarea}, ${city}.`,
    subarea,
  }
}

async function generateBuyerPersonasPage(
  agentName: string,
  brokerage: string,
  agentSlug: string,
  subarea: string,
  city: string,
): Promise<GeneratedPage> {
  const stats = await fetchNeighbourhoodStats(agentSlug, subarea)
  const statsContext = formatStatsContext(stats)

  const prompt = [
    `You are a real estate content strategist. Create a buyer personas profile for the neighbourhood of ${subarea}, ${city}, BC, Canada.`,
    ``,
    `Agent context:`,
    `- Agent: ${agentName}${brokerage ? `, ${brokerage}` : ''}`,
    `- Neighbourhood: ${subarea}, ${city}`,
    ``,
    statsContext ? statsContext : '',
    ``,
    `Requirements:`,
    `- Identify 2–3 buyer types most likely to choose ${subarea} (e.g. "Move-up Families", "Empty Nesters", "First-time Buyers", "Young Professionals", "Downsizers", "Investors")`,
    `- For each persona, explain specifically why they choose this neighbourhood — ground claims in the stats above where possible`,
    `- List 3–5 concise pros that apply to this neighbourhood overall`,
    `- Tone: confident, data-grounded, primarily positive — like a trusted local expert`,
    `- Do NOT invent specific price claims beyond what the stats above show`,
    ``,
    `Respond in this EXACT JSON format (no markdown, no code fence):`,
    `{`,
    `  "best_for": ["short label 1", "short label 2", "short label 3"],`,
    `  "personas": [`,
    `    {"type": "Buyer Type Name", "description": "1-2 sentence profile of this buyer", "why_they_chose_it": "2-3 sentences grounded in neighbourhood traits and stats"}`,
    `  ],`,
    `  "pros": ["pro 1 (concise)", "pro 2", "pro 3", "pro 4", "pro 5"],`,
    `  "meta_description": "145-160 char description"`,
    `}`,
  ].filter(Boolean).join('\n')

  const raw = await callClaude(prompt, 1000)
  let parsed: {
    best_for?: string[]
    personas?: { type: string; description: string; why_they_chose_it: string }[]
    pros?: string[]
    meta_description?: string
  } = {}
  try { parsed = JSON.parse(raw) } catch { parsed = {} }

  const contentObj = {
    best_for: parsed.best_for ?? [],
    personas: parsed.personas ?? [],
    pros: parsed.pros ?? [],
    stats: stats ?? undefined,
  }

  return {
    page_type: 'buyer_personas',
    slug: `buyer-personas-${toSlug(subarea)}`,
    title: `Who Buys in ${subarea} — Buyer Persona Guide`,
    content: JSON.stringify(contentObj),
    meta_description: parsed.meta_description || `Discover who buys homes in ${subarea}, ${city} — buyer personas, lifestyle fit, and top neighbourhood pros.`,
    subarea,
  }
}

async function generateAreaIntroPage(
  agentName: string,
  brokerage: string,
  territories: string[],
  subareas: { subarea: string; city: string }[],
): Promise<GeneratedPage> {
  const regionName = territories.length === 1 ? territories[0] : territories.slice(0, -1).join(', ') + ' & ' + territories[territories.length - 1]
  const subareaList = subareas.map((s) => s.subarea).slice(0, 10).join(', ')

  const prompt = [
    `You are a real estate content writer. Write an editorial area overview for a real estate agent's coverage territory in BC, Canada.`,
    ``,
    `Agent context:`,
    `- Agent: ${agentName}${brokerage ? `, ${brokerage}` : ''}`,
    `- Coverage region: ${regionName}`,
    `- Neighbourhoods covered: ${subareaList}`,
    ``,
    `Requirements:`,
    `- Length: 500–700 words of flowing editorial prose`,
    `- Write in paragraphs — no bullet points or headers`,
    `- Cover: the overall character and appeal of the region, neighbourhood variety (briefly what each area attracts and offers), lifestyle themes that run through the region, why buyers choose this region over alternatives (proximity to Vancouver, outdoor lifestyle, schools, value, community)`,
    `- Include a closing paragraph that positions ${agentName} as the trusted local expert for this region`,
    `- Tone: warm, confident, editorial — like a regional lifestyle magazine piece`,
    `- Do NOT invent specific prices or statistics`,
    `- Naturally weave in area names for SEO`,
    ``,
    `Respond in this EXACT JSON format (no markdown, no code fence):`,
    `{"title":"...(55-70 chars)","meta_description":"...(145-160 chars)","content":"...(full body text)"}`,
  ].join('\n')

  const raw = await callClaude(prompt, 1600)
  let parsed: { title?: string; meta_description?: string; content?: string } = {}
  try { parsed = JSON.parse(raw) } catch { parsed = { title: `${regionName} Real Estate Guide`, content: raw, meta_description: '' } }

  return {
    page_type: 'area_intro',
    slug: `area-intro-${toSlug(regionName)}`,
    title: parsed.title || `${regionName} Real Estate — Area Overview`,
    content: parsed.content || '',
    meta_description: parsed.meta_description || `Explore ${regionName} real estate with ${agentName} — your trusted local guide to neighbourhoods, lifestyle, and homes.`,
    subarea: '_area',
  }
}

async function generateNeighbourhoodDescription(
  agentName: string,
  brokerage: string,
  agentSlug: string,
  subarea: string,
  city: string,
): Promise<GeneratedPage> {
  const stats = await fetchNeighbourhoodStats(agentSlug, subarea)
  const statsContext = formatStatsContext(stats)

  const prompt = [
    `You are a real estate content writer for a Canadian real estate website covering Metro Vancouver and the Lower Mainland of British Columbia.`,
    ``,
    `Write a 3-paragraph neighbourhood description for ${subarea}, ${city}, BC, Canada. This will appear as the hero introduction on a real estate neighbourhood page.`,
    ``,
    `Agent context:`,
    `- Agent: ${agentName}${brokerage ? `, ${brokerage}` : ''}`,
    ``,
    statsContext || '',
    ``,
    `Requirements:`,
    `- Total length: 280–380 words across 3 paragraphs`,
    `- Paragraph 1: Neighbourhood character and community feel — who lives here, what makes it distinct, the lifestyle it offers`,
    `- Paragraph 2: Housing landscape — types of homes available (detached, townhomes, condos), price context using the live stats above if provided, who the typical buyer is`,
    `- Paragraph 3: Location advantages and why buyers choose ${subarea} — schools, parks, transit, proximity to amenities, access to the broader region`,
    `- Tone: warm, factual, and informative — like a knowledgeable local agent speaking to a buyer`,
    `- Canadian English: neighbourhood, storey, centre, colour`,
    `- Naturally include "${subarea} real estate" and "${subarea} homes for sale" once each for SEO`,
    `- Do NOT invent specific prices beyond what the stats show. Do NOT use hype words: no "stunning", "luxurious", "prestigious", "breathtaking"`,
    `- Write in flowing prose only — no bullet points, no headers`,
    ``,
    `Respond in this EXACT JSON format (no markdown, no code fence):`,
    `{"title":"...(50-65 chars)","meta_description":"...(145-160 chars)","content":"...(3 paragraphs separated by \\n\\n)"}`,
  ].filter(Boolean).join('\n')

  const raw = await callClaude(prompt, 900)
  let parsed: { title?: string; meta_description?: string; content?: string } = {}
  try { parsed = JSON.parse(raw) } catch { parsed = { title: `${subarea} Neighbourhood Guide`, content: raw, meta_description: '' } }

  return {
    page_type: 'neighbourhood_description',
    slug: `neighbourhood-desc-${toSlug(subarea)}`,
    title: parsed.title || `${subarea}, ${city} — Neighbourhood Overview`,
    content: parsed.content || '',
    meta_description: parsed.meta_description || `Explore ${subarea} real estate — neighbourhood character, housing types, and why buyers choose ${subarea} in ${city}, BC.`,
    subarea,
  }
}

const ALLOWED_TYPES = ['lifestyle_seo', 'school_catchment', 'amenities', 'buyer_personas', 'area_intro', 'all_lifestyle', 'all_buyer_personas', 'neighbourhood_description', 'all_neighbourhood_descriptions']

const TERRITORY_SUBAREAS: Record<string, string[]> = {
  'Surrey': ['South Surrey White Rock', 'White Rock', 'Cloverdale BC', 'Morgan Creek', 'Grandview Surrey', 'Ocean Park Surrey', 'Semiahmoo', 'Fleetwood Tynehead'],
  'Vancouver': ['Yaletown', 'Coal Harbour', 'West End', 'Kitsilano', 'Kerrisdale', 'Dunbar'],
  'Burnaby': ['Metrotown', 'Brentwood', 'Edmonds', 'Highgate'],
  'Richmond': ['Steveston', 'Hamilton', 'Broadmoor', 'Brighouse'],
  'Coquitlam': ['Burke Mountain', 'New Horizons', 'Westwood Plateau'],
  'Langley': ['Willoughby Heights', 'Walnut Grove', 'Fort Langley'],
  'Abbotsford': ['Abbotsford West', 'Central Abbotsford'],
  'Chilliwack': ['Chilliwack Proper West', 'Chilliwack Proper East'],
}

function buildSubareas(territories: string[], subareaWhitelist: string[] | null): { subarea: string; city: string }[] {
  if (subareaWhitelist && subareaWhitelist.length > 0) {
    return subareaWhitelist.map((s) => ({ subarea: s, city: territories[0] || 'Surrey' }))
  }
  const result: { subarea: string; city: string }[] = []
  for (const city of territories) {
    const citySubs = TERRITORY_SUBAREAS[city] ?? []
    for (const sub of citySubs) {
      result.push({ subarea: sub, city })
    }
    if (citySubs.length === 0) {
      result.push({ subarea: city, city })
    }
  }
  return result
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try { session = await getAdminSession() } catch {}
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  let body: { type?: string; subarea?: string } = {}
  try { body = await req.json() } catch {}
  const { type, subarea: singleSubarea } = body

  if (!type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
  }

  const agentRes = await laravelAdminFetch(`/agents/${id}`)
  if (!agentRes.ok) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  const agent = await agentRes.json()

  const agentName: string = agent.name || 'Your Agent'
  const agentSlug: string = agent.slug || ''
  const brokerage: string = agent.brokerage || ''
  const territories: string[] = agent.territories || []
  const subareaWhitelist: string[] | null = agent.settings?.subarea_whitelist ?? null

  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'No AI API key configured. Set ANTHROPIC_API_KEY in environment secrets.' }, { status: 500 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(data) + '\n')) } catch {}
      }

      const savePage = async (page: GeneratedPage): Promise<boolean> => {
        try {
          const saveRes = await laravelAdminFetch(`/agents/${id}/ai-pages`, {
            method: 'POST',
            body: JSON.stringify({ pages: [page] }),
          })
          return saveRes.ok
        } catch {
          return false
        }
      }

      try {
        const generatedCount = { value: 0 }
        const errors: string[] = []

        if (type === 'area_intro') {
          const subareas = buildSubareas(territories, subareaWhitelist)
          try {
            const page = await generateAreaIntroPage(agentName, brokerage, territories, subareas)
            const saved = await savePage(page)
            if (saved) {
              generatedCount.value++
              send({ progress: { subarea: '_area', saved: true, count: 1, total: 1 } })
            } else {
              errors.push('Area intro: save failed')
              send({ progress: { subarea: '_area', saved: false, error: 'save failed' } })
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`Area intro: ${msg}`)
            send({ progress: { subarea: '_area', saved: false, error: msg } })
          }
        } else {
          let subareas: { subarea: string; city: string }[] = []
          if ((type === 'buyer_personas' || type === 'neighbourhood_description') && singleSubarea) {
            subareas = [{ subarea: singleSubarea, city: territories[0] || 'Surrey' }]
          } else {
            subareas = buildSubareas(territories, subareaWhitelist)
          }

          if (subareas.length === 0) {
            send({ done: false, error: 'No territory subareas found for this agent' })
            controller.close()
            return
          }

          for (const { subarea, city } of subareas) {
            try {
              let page: GeneratedPage
              if (type === 'lifestyle_seo' || type === 'all_lifestyle') {
                page = await generateLifestylePage(agentName, brokerage, subarea, city, territories)
              } else if (type === 'school_catchment') {
                page = await generateSchoolCatchmentPage(agentName, subarea, city)
              } else if (type === 'amenities') {
                page = await generateAmenitiesPage(agentName, subarea, city)
              } else if (type === 'neighbourhood_description' || type === 'all_neighbourhood_descriptions') {
                page = await generateNeighbourhoodDescription(agentName, brokerage, agentSlug, subarea, city)
              } else {
                page = await generateBuyerPersonasPage(agentName, brokerage, agentSlug, subarea, city)
              }
              const saved = await savePage(page)
              if (saved) {
                generatedCount.value++
                send({ progress: { subarea, saved: true, count: generatedCount.value, total: subareas.length } })
              } else {
                errors.push(`${subarea}: save failed`)
                send({ progress: { subarea, saved: false, error: 'save failed' } })
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              errors.push(`${subarea}: ${msg}`)
              send({ progress: { subarea, saved: false, error: msg } })
            }
            if (subareas.length > 1) await new Promise((r) => setTimeout(r, 500))
          }
        }

        send({ done: true, generated: generatedCount.value, errors: errors.length > 0 ? errors : undefined })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        send({ done: false, error: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache, no-transform',
      'Transfer-Encoding': 'chunked',
    },
  })
}
