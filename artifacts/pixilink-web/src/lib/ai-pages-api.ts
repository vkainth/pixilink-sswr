/**
 * API functions for agent AI-generated pages.
 * Fetches from the Laravel /api-internal/agent/{slug}/ai-pages endpoints.
 */

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null

function laravelHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

export interface AiPage {
  id: number
  page_type: 'lifestyle_seo' | 'school_catchment' | 'amenities'
  slug: string
  title: string
  content?: string
  meta_description: string | null
  subarea: string | null
  generated_at: string | null
}

export async function getAiPages(agentSlug: string, type?: string): Promise<AiPage[]> {
  try {
    const qs = type ? `?type=${encodeURIComponent(type)}` : ''
    const res = await fetch(`${LARAVEL_URL}/api-internal/agent/${agentSlug}/ai-pages${qs}`, {
      headers: laravelHeaders(),
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data as AiPage[]
    }
  } catch {}
  return []
}

export async function getAiPage(agentSlug: string, pageSlug: string): Promise<AiPage | null> {
  try {
    const res = await fetch(`${LARAVEL_URL}/api-internal/agent/${agentSlug}/ai-pages/${pageSlug}`, {
      headers: laravelHeaders(),
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.slug) return data as AiPage
    }
  } catch {}
  return null
}

export function matchAiPageToSubarea(pages: AiPage[], subareaSlug: string): AiPage | null {
  if (pages.length === 0) return null
  const normalized = subareaSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  for (const p of pages) {
    const pSubarea = (p.subarea || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (pSubarea === normalized || p.slug.includes(normalized) || normalized.includes(pSubarea)) {
      return p
    }
  }
  return null
}
