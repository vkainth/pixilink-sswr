/**
 * Server-side client for the Laravel /api-internal/admin/* endpoints.
 * All calls include the X-Admin-Secret header.
 */

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
// Admin API calls must NOT inherit LARAVEL_API_HOST (website.pixilink.com) — that host
// triggers a domain redirect in the PHP app, turning every PUT into a redirect response.
// Use ADMIN_LARAVEL_HOST if explicitly set; otherwise send no Host override so the
// PHP-FPM default vhost handles it (which is the bccondosandhomes / admin app).
const LARAVEL_HOST = process.env.ADMIN_LARAVEL_HOST ?? null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

export interface AdminAgent {
  id: number
  name: string
  slug: string
  brokerage: string | null
  email: string
  phone: string | null
  status: string
  theme_slug: string | null
  theme_color: string | null
  custom_domain: string | null
  territories: string[]
  // full detail fields (present when fetching single agent)
  bio?: string | null
  license_number?: string | null
  photo_path?: string | null
  headshot_path?: string | null
  logo_path?: string | null
  primary_bg_color?: string | null
  brand_text_color?: string | null
  mls_ids?: string[]
  settings?: {
    guide_name?: string | null
    custom_domain: string | null
    notification_email: string | null
    notification_phone: string | null
    ga4_id: string | null
    fb_pixel_id: string | null
    fub_enabled: boolean
    ghl_enabled: boolean
    ghl_api_key_set: boolean
    ghl_location_id_set: boolean
    lofty_enabled: boolean
    lofty_api_key_set: boolean
    social_links: Record<string, string>
    lead_routing: Record<string, string> | null
    intro_video_url: string | null
    seo_noindex: boolean
    subarea_whitelist: string[] | null
    photo_focal_x?: number
    photo_focal_y?: number
    residencity_region?: string | null
    favicon_url?: string | null
    designation?: string | null
    hero_stats?: {
      stat1_value?: string | null
      stat1_label?: string | null
      stat2_value?: string | null
      stat2_label?: string | null
      stat3_value?: string | null
      stat3_label?: string | null
      stat4_value?: string | null
      stat4_label?: string | null
      trust_chips?: Array<{ text: string; icon?: string } | string>
      highlights?: Array<{ text: string; icon?: string }>
      years_experience?: string | null
      value_prop_blurb?: string | null
    } | null
    achievements?: Array<{ label: string }> | null
    co_agent_achievements?: Record<string, Array<{ label: string }>> | null
    team_members?: Array<{ name: string; title: string; phone: string; email: string; bio: string; photo: string | null }> | null
    site_config?: {
      layout_preset?: string
      showcase_hero_style?: string
      [key: string]: unknown
    } | null
  } | null
  features?: Record<string, boolean>
}

export interface AdminLead {
  id: number
  /** users.id — present when the lead registered an account; null for anonymous form submits */
  user_id: number | null
  name: string
  email: string | null
  phone: string | null
  message: string | null
  notes: string | null
  form_type: string | null
  form_type_label: string
  property_address: string | null
  offer_context: string | null
  contacted_at: string | null
  created_at: string
  /** Browsing-context fields for the human-readable "Context" label */
  source_url: string | null
  listing_slug: string | null
}

export interface PropertyView {
  listing_id: string | null
  building_slug: string | null
  address_label: string
  view_count: number
  first_viewed_at: string
  last_viewed_at: string
}

export async function getLeadPropertyViews(userId: number, agentId?: number): Promise<PropertyView[]> {
  const qs = agentId ? `?agent_id=${agentId}` : ''
  try {
    const res = await adminFetch(`/leads/${userId}/property-views${qs}`, { next: { revalidate: 0 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

/**
 * Thrown when the Laravel admin API answers with a non-2xx status.
 *
 * Carries the status and the parsed body so callers can tell a real 422
 * validation failure apart from a 500/404/401. Without the status, a backend
 * crash was being reported to the user as "Validation failed".
 */
export class AdminApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(JSON.stringify(body))
    this.name = 'AdminApiError'
    this.status = status
    this.body = body
  }
}

function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return { ...h, ...extra }
}

async function adminFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${LARAVEL_URL}/api-internal/admin${path}`, {
    ...opts,
    headers: { ...adminHeaders(), ...((opts.headers as Record<string, string>) || {}) },
  })
}

export async function adminAuth(email: string, password: string): Promise<{ id: number; name: string; email: string } | null> {
  const res = await adminFetch('/auth', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function listAgents(): Promise<AdminAgent[]> {
  const res = await adminFetch('/agents', { next: { revalidate: 0 } })
  if (!res.ok) return []
  return res.json()
}

export async function getAgent(id: number): Promise<AdminAgent | null> {
  const res = await adminFetch(`/agents/${id}`, { next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

export async function createAgent(data: Record<string, unknown>): Promise<AdminAgent | null> {
  const res = await adminFetch('/agents', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function updateAgent(id: number, data: Record<string, unknown>): Promise<AdminAgent | null> {
  const res = await adminFetch(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function updateAgentIntegrations(id: number, data: Record<string, unknown>): Promise<void> {
  const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
  const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) headers['Host'] = LARAVEL_HOST
  const res = await fetch(`${LARAVEL_URL}/api-internal/agent-portal/${id}/integrations`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
}

export async function deleteAgent(id: number): Promise<boolean> {
  const res = await adminFetch(`/agents/${id}`, { method: 'DELETE' })
  return res.ok
}

export async function getAgentLeads(id: number): Promise<AdminLead[]> {
  const res = await adminFetch(`/agents/${id}/leads`, { next: { revalidate: 0 } })
  if (!res.ok) return []
  return res.json()
}

export interface AdminLeadWithAgent extends AdminLead {
  agent_id: number
  agent_name: string
  agent_slug: string
}

export interface AllLeadsResponse {
  leads: AdminLeadWithAgent[]
  by_agent: { agent_id: number; agent_name: string; total: number }[]
  from: string
  to: string
}

export async function getAllLeads(params?: {
  agent_id?: number
  form_type?: string
  from?: string
  to?: string
}): Promise<AllLeadsResponse> {
  const qs = params ? '?' + new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString() : ''
  const res = await adminFetch(`/leads${qs}`, { next: { revalidate: 0 } })
  if (!res.ok) return { leads: [], by_agent: [], from: '', to: '' }
  return res.json()
}

export async function updateAgentFeatures(id: number, features: Record<string, boolean>): Promise<boolean> {
  const res = await adminFetch(`/agents/${id}/features`, {
    method: 'PUT',
    body: JSON.stringify({ features }),
  })
  return res.ok
}

export interface SoldGateAgentStat {
  slug: string
  register: number
  login: number
  prompt_impression: number
  prompt_dismiss: number
}

export interface SoldGateStats {
  period_days: number
  total_register: number
  total_login: number
  /** Denominator. Without it a gate's conversion rate cannot be computed at all. */
  total_impression: number
  total_dismiss: number
  by_agent: SoldGateAgentStat[]
}

export async function getSoldGateStats(days = 30): Promise<SoldGateStats | null> {
  const res = await adminFetch(`/sold-gate-stats?days=${days}`, { next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

export interface SoldGateDayStat {
  day: string
  register: number
  login: number
  prompt_impression: number
  prompt_dismiss: number
}

export interface SoldGateStatsByDay {
  period_days: number
  daily: SoldGateDayStat[]
}

export async function getSoldGateStatsByDay(days = 30): Promise<SoldGateStatsByDay | null> {
  const res = await adminFetch(`/sold-gate-stats-by-day?days=${days}`, { next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

export interface PlatformSummary {
  active_agent_sites: number
  total_leads: number
  leads_last_30_days: number
}

export async function getPlatformSummary(): Promise<PlatformSummary | null> {
  const res = await adminFetch('/platform-summary', { next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

export interface TerritoryCitiesResponse {
  cities: string[]
  subareas: Record<string, string[]>
}

export async function getTerritoryCities(): Promise<TerritoryCitiesResponse> {
  const res = await adminFetch('/territory-cities', { next: { revalidate: 3600 } })
  if (!res.ok) return { cities: FALLBACK_CITIES, subareas: {} }
  const data = await res.json()
  // Handle both old shape (array) and new shape ({cities, subareas})
  if (Array.isArray(data)) return { cities: data, subareas: {} }
  return data
}

export interface AdminLandingPage {
  id: number
  agent_id: number
  city_slug: string
  city_display_name: string
  area_slug: string | null
  area_display_name: string
  province: string
  respond_time_label: string
  award_badges: string[]
  stat_years_exp: number | null
  stat_sold_volume: string | null
  stat_team_size: number | null
  stat_award_label: string | null
  value_prop_cards: { emoji: string; heading: string; copy: string }[]
  testimonials: { quote: string; name: string; city: string }[]
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export async function getAdminLandingPages(agentId: number): Promise<AdminLandingPage[]> {
  const res = await adminFetch(`/agents/${agentId}/landing-pages`, { next: { revalidate: 0 } })
  if (!res.ok) return []
  return res.json()
}

export async function createAdminLandingPage(agentId: number, data: Partial<AdminLandingPage>): Promise<AdminLandingPage | null> {
  const res = await adminFetch(`/agents/${agentId}/landing-pages`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function updateAdminLandingPage(agentId: number, pageId: number, data: Partial<AdminLandingPage>): Promise<AdminLandingPage | null> {
  const res = await adminFetch(`/agents/${agentId}/landing-pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function deleteAdminLandingPage(agentId: number, pageId: number): Promise<boolean> {
  const res = await adminFetch(`/agents/${agentId}/landing-pages/${pageId}`, { method: 'DELETE' })
  return res.ok
}

export interface AdminAreaComparison {
  id: number
  agent_id: number
  slug: string
  title: string
  intro: string
  area_a_subarea_slug: string
  area_a_label: string
  area_a_buyer_profile: string
  area_a_pros: string[]
  area_a_cons: string[]
  area_b_subarea_slug: string
  area_b_label: string
  area_b_buyer_profile: string
  area_b_pros: string[]
  area_b_cons: string[]
  verdict: string
  status: 'draft' | 'published'
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export async function getAdminAreaComparisons(agentId: number): Promise<AdminAreaComparison[]> {
  const res = await adminFetch(`/agents/${agentId}/area-comparisons`, { next: { revalidate: 0 } })
  if (!res.ok) return []
  return res.json()
}

export async function createAdminAreaComparison(agentId: number, data: Partial<AdminAreaComparison>): Promise<AdminAreaComparison | null> {
  const res = await adminFetch(`/agents/${agentId}/area-comparisons`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function updateAdminAreaComparison(agentId: number, comparisonId: number, data: Partial<AdminAreaComparison>): Promise<AdminAreaComparison | null> {
  const res = await adminFetch(`/agents/${agentId}/area-comparisons/${comparisonId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function deleteAdminAreaComparison(agentId: number, comparisonId: number): Promise<boolean> {
  const res = await adminFetch(`/agents/${agentId}/area-comparisons/${comparisonId}`, { method: 'DELETE' })
  return res.ok
}

export interface AdminBestOfListItem {
  slug: string
  label: string
  type: 'building' | 'area'
  blurb: string
  image_url?: string | null
}

export interface AdminBestOfList {
  id: number
  agent_id: number
  slug: string
  title: string
  intro: string
  kind: 'building' | 'area'
  items: AdminBestOfListItem[]
  status: 'draft' | 'published'
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export async function getAdminBestOfLists(agentId: number): Promise<AdminBestOfList[]> {
  const res = await adminFetch(`/agents/${agentId}/best-of-lists`, { next: { revalidate: 0 } })
  if (!res.ok) return []
  return res.json()
}

export async function createAdminBestOfList(agentId: number, data: Partial<AdminBestOfList>): Promise<AdminBestOfList | null> {
  const res = await adminFetch(`/agents/${agentId}/best-of-lists`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function updateAdminBestOfList(agentId: number, listId: number, data: Partial<AdminBestOfList>): Promise<AdminBestOfList | null> {
  const res = await adminFetch(`/agents/${agentId}/best-of-lists/${listId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function deleteAdminBestOfList(agentId: number, listId: number): Promise<boolean> {
  const res = await adminFetch(`/agents/${agentId}/best-of-lists/${listId}`, { method: 'DELETE' })
  return res.ok
}

/**
 * A testimonial as the admin screen sees it.
 *
 * `source` is what appears as the attribution on the public site. 'manual' renders no
 * attribution at all, which is the honest default for a quote an agent supplied
 * directly — only name a platform when the review genuinely came from it.
 */
export interface AdminTestimonial {
  id: number
  source: string
  external_id: string | null
  author_name: string
  rating: number
  body: string
  date: string | null
  visible: boolean
}

export async function getAdminTestimonials(agentId: number): Promise<AdminTestimonial[]> {
  const res = await adminFetch(`/agents/${agentId}/testimonials`, { next: { revalidate: 0 } })
  if (!res.ok) return []
  return res.json()
}

export async function createAdminTestimonial(agentId: number, data: Partial<AdminTestimonial>): Promise<AdminTestimonial | null> {
  const res = await adminFetch(`/agents/${agentId}/testimonials`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function updateAdminTestimonial(agentId: number, testimonialId: number, data: Partial<AdminTestimonial>): Promise<AdminTestimonial | null> {
  const res = await adminFetch(`/agents/${agentId}/testimonials/${testimonialId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, err)
  }
  return res.json()
}

export async function deleteAdminTestimonial(agentId: number, testimonialId: number): Promise<boolean> {
  const res = await adminFetch(`/agents/${agentId}/testimonials/${testimonialId}`, { method: 'DELETE' })
  return res.ok
}

export interface AdminSiteUser {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  agent_id: number
  agent_name: string
  agent_slug: string
  email_verified: boolean
  phone_verified: boolean
  google_linked: boolean
  created_at: string
}

export interface AdminUsersResponse {
  users: AdminSiteUser[]
  by_agent: { agent_id: number; agent_name: string; agent_slug: string; total: number }[]
  total: number
}

export interface AgentSiteUser {
  id: number
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  email_verified: boolean
  phone_verified: boolean
  google_linked: boolean
  created_at: string
}

export interface AgentUsersResponse {
  agent_id: number
  agent_name: string
  agent_slug: string
  users: AgentSiteUser[]
  total: number
}

export async function getAdminUsers(params?: { agent_id?: number; search?: string }): Promise<AdminUsersResponse> {
  const qs = params ? '?' + new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString() : ''
  const res = await adminFetch(`/users${qs}`, { next: { revalidate: 0 } })
  if (!res.ok) return { users: [], by_agent: [], total: 0 }
  return res.json()
}

export async function getAgentUsers(agentId: number): Promise<AgentUsersResponse | null> {
  const res = await adminFetch(`/agents/${agentId}/users`, { next: { revalidate: 0 } })
  if (!res.ok) return null
  return res.json()
}

export interface PlatformSettings {
  global_noindex: boolean
}

/**
 * Platform settings.
 *
 * Called from the ROOT layout's generateMetadata(), so it runs on every
 * uncached page view across every agent site. It was uncached
 * (revalidate: 0), which meant ordinary visitor traffic spent from the same
 * IP-keyed rate-limit bucket (throttle:600,1 on Laravel's whole `admin`
 * prefix) that the admin batch tools need -- so a busy site could throttle
 * out a bulk generation run's saves.
 *
 * The only field read on the public path is global_noindex, which changes
 * approximately never, so a 5 minute cache is ample. Pass fresh = true where
 * the current value must be exact (the admin settings screen).
 */
export async function getPlatformSettings(fresh = false): Promise<PlatformSettings> {
  try {
    const res = await adminFetch('/platform-settings', fresh
      ? { cache: 'no-store' }
      : { next: { revalidate: 300 } })
    if (!res.ok) return { global_noindex: false }
    return res.json()
  } catch {
    return { global_noindex: false }
  }
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<boolean> {
  const res = await adminFetch('/platform-settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
  return res.ok
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface AdminBillingAgent {
  id: number
  name: string
  slug: string
  status: string
  custom_domain: string | null
  billing_tier: string | null
  billing_status: string
  next_billing_date: string | null
  last_payment_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  notification_email: string | null
}

export interface AdminBillingTier {
  label: string
  mrr: number
}

export interface AdminBillingListResponse {
  agents: AdminBillingAgent[]
  mrr: number
  tiers: Record<string, AdminBillingTier>
}

export async function adminBillingList(): Promise<AdminBillingListResponse> {
  const res = await adminFetch('/billing', { next: { revalidate: 0 } })
  if (!res.ok) return { agents: [], mrr: 0, tiers: {} }
  return res.json()
}

export async function adminBillingCreateSubscription(
  agentId: number,
  data: { tier: string; email: string }
): Promise<{ subscription_id?: string; billing_status?: string; message?: string; error?: string }> {
  const res = await adminFetch(`/billing/${agentId}/subscription`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to create subscription')
  return json
}

export async function adminBillingCancelSubscription(
  agentId: number
): Promise<{ success?: boolean; message?: string; error?: string }> {
  const res = await adminFetch(`/billing/${agentId}/subscription`, { method: 'DELETE' })
  return res.json().catch(() => ({ success: res.ok }))
}

export async function adminBillingEmailPortalUrl(
  agentId: number
): Promise<{ url?: string; email_sent?: boolean; email_to?: string | null; email_error?: string | null; error?: string }> {
  const res = await adminFetch(`/billing/${agentId}/email-portal`, { method: 'POST' })
  return res.json().catch(() => ({ error: 'Failed' }))
}

export async function adminBillingOneTimeCharge(
  agentId: number,
  data: { amount_cents: number; description: string }
): Promise<{ payment_intent_id?: string; status?: string; amount?: string; message?: string; error?: string }> {
  const res = await adminFetch(`/billing/${agentId}/charge`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Charge failed')
  return json
}

export async function adminBillingManualSuspend(agentId: number): Promise<boolean> {
  const res = await adminFetch(`/billing/${agentId}/suspend`, { method: 'POST' })
  return res.ok
}

export async function adminBillingManualReactivate(agentId: number): Promise<boolean> {
  const res = await adminFetch(`/billing/${agentId}/reactivate`, { method: 'POST' })
  return res.ok
}

const FALLBACK_CITIES = [
  'Vancouver', 'Burnaby', 'Richmond', 'Surrey', 'Coquitlam', 'Port Coquitlam',
  'Port Moody', 'New Westminster', 'North Vancouver', 'West Vancouver', 'Langley',
  'Abbotsford', 'Chilliwack', 'Mission', 'Maple Ridge', 'Pitt Meadows',
  'Delta', 'White Rock', 'South Surrey White Rock', 'Cloverdale',
  'Squamish', 'Whistler',
]
