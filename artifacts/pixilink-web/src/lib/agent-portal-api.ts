/**
 * Server-side client for agent-portal-specific Laravel API endpoints.
 * Uses X-Admin-Secret for shared internal calls; agent-scoped paths.
 */

const LARAVEL_URL = process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'
const LARAVEL_HOST = process.env.LARAVEL_API_HOST || null
const ADMIN_SECRET = process.env.ADMIN_API_SECRET || ''

export interface AgentPortalDashboard {
  leads_this_month: number
  page_views_30d: number
  active_listings: number
  open_houses_this_week: number
  recent_leads: AgentPortalLead[]
  site_domain: string | null
  site_mode: 'demo' | 'live'
  subscription_plan: string | null
  subscription_status: string | null
  next_payment_date: string | null
  monthly_amount: number | null
}

export interface AgentPortalLead {
  id: number
  /** users.id — present when the lead registered an account */
  user_id: number | null
  name: string
  phone: string | null
  email: string | null
  type: string
  form_type_label: string
  source: string | null
  listing_slug: string | null
  offer_context: string | null
  page_views: number
  saved_searches: number
  avg_price: number | null
  last_viewed: string | null
  last_viewed_type: string | null
  last_login: string | null
  created_at: string
  contacted: boolean
  verified: boolean
}

export interface AgentPortalProfile {
  name: string
  title: string | null
  brokerage: string | null
  phone: string | null
  email: string
  bio: string | null
  photo_path: string | null
  intro_video_url: string | null
  social_links: Record<string, string>
}

export interface AgentPortalTeamMember {
  id: number
  name: string
  title: string | null
  brokerage: string | null
  mls_id: string | null
  email: string | null
  phone: string | null
  bio: string | null
  photo_path: string | null
  status: 'active' | 'paused'
}

export interface AgentPortalFeaturedListing {
  id: string
  address: string
  type: string
  beds: number | null
  price: string | null
  photo_url: string | null
  mls_id: string
}

function agentPortalHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Admin-Secret': ADMIN_SECRET,
  }
  if (LARAVEL_HOST) h['Host'] = LARAVEL_HOST
  return h
}

async function agentFetch(
  agentId: number,
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  return fetch(`${LARAVEL_URL}/api-internal/agent-portal/${agentId}${path}`, {
    ...opts,
    headers: {
      ...agentPortalHeaders(),
      // X-Agent-ID is validated server-side against the route {id} parameter,
      // providing agent-identity enforcement at the Laravel API layer.
      'X-Agent-ID': String(agentId),
      ...((opts.headers as Record<string, string>) || {}),
    },
  })
}

export async function agentPortalAuth(
  email: string,
  password: string
): Promise<{ id: number; name: string; email: string; slug: string; theme_color: string | null; theme_slug: string | null; domain: string | null } | null> {
  const res = await fetch(`${LARAVEL_URL}/api-internal/agent-portal/auth`, {
    method: 'POST',
    headers: agentPortalHeaders(),
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getAgentPortalDashboard(agentId: number): Promise<AgentPortalDashboard | null> {
  try {
    const res = await agentFetch(agentId, '/dashboard', { next: { revalidate: 0 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getAgentPortalLeads(agentId: number): Promise<AgentPortalLead[]> {
  try {
    const res = await agentFetch(agentId, '/leads', { next: { revalidate: 0 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getAgentPortalProfile(agentId: number): Promise<AgentPortalProfile | null> {
  try {
    const res = await agentFetch(agentId, '/profile', { next: { revalidate: 0 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateAgentPortalProfile(agentId: number, data: Partial<AgentPortalProfile>): Promise<boolean> {
  try {
    const res = await agentFetch(agentId, '/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

export interface AgentPortalIntegrations {
  ga4_id: string | null
  fub_enabled: boolean
  ghl_enabled: boolean
}

export async function getAgentPortalIntegrations(agentId: number): Promise<AgentPortalIntegrations | null> {
  try {
    const res = await agentFetch(agentId, '/integrations', { next: { revalidate: 0 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateAgentPortalIntegrations(
  agentId: number,
  data: {
    ga4_id?: string | null
    fub_enabled?: boolean
    fub_api_key?: string
    ghl_enabled?: boolean
    ghl_api_key?: string
  }
): Promise<AgentPortalIntegrations | null> {
  try {
    const res = await agentFetch(agentId, '/integrations', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getAgentPortalTeam(agentId: number): Promise<AgentPortalTeamMember[]> {
  try {
    const res = await agentFetch(agentId, '/team', { next: { revalidate: 0 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getAgentPortalFeaturedListings(agentId: number): Promise<AgentPortalFeaturedListing[]> {
  try {
    const res = await agentFetch(agentId, '/featured-listings', { next: { revalidate: 0 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface AgentBillingInvoice {
  id: string
  date: string
  amount: string
  description: string
  invoice_pdf: string | null
  hosted_url: string | null
  status: string
}

export interface AgentPortalBillingStatus {
  billing_tier: string | null
  billing_tier_label: string | null
  billing_tier_amount: string | null
  billing_status: string
  next_billing_date: string | null
  last_payment_at: string | null
  has_stripe_customer: boolean
  has_payment_method: boolean
  payment_method_brand: string | null
  payment_method_last4: string | null
  invoices: AgentBillingInvoice[]
}

export async function getAgentPortalBillingStatus(agentId: number): Promise<AgentPortalBillingStatus | null> {
  try {
    const res = await agentFetch(agentId, '/billing', { next: { revalidate: 0 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function getAgentPortalBillingPortalUrl(agentId: number): Promise<{ url?: string; error?: string }> {
  try {
    const res = await agentFetch(agentId, '/billing-portal', { method: 'POST' })
    return res.json()
  } catch {
    return { error: 'Request failed' }
  }
}
