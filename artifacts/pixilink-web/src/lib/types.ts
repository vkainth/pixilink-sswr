export interface AuthUser {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  name: string
  initials: string
  phone: string | null
  phone_country_code: string
  email_verified: boolean
  profile_complete: boolean
  phone_verified: boolean
  terms_accepted: boolean
  next_step: 'verify_email' | 'complete_profile' | 'verify_phone' | 'accept_terms' | 'done'
}

export interface AuthResponse {
  token: string
  user: AuthUser
  next_step: string
}

export interface AgentProfile {
  id: number
  slug: string
  name: string
  brokerage: string
  phone: string
  email: string | null
  bio: string | null
  photo_path: string | null
  logo_path: string | null
  license_number: string | null
  theme_slug: string
  theme_color: string
  primary_bg_color: string
  brand_text_color: string
  status: string
  photo_focal_x?: number
  photo_focal_y?: number
  headshot_path?: string | null
  settings: AgentSettings | null
  features?: Record<string, boolean>
}

export interface AgentSettings {
  guide_name: string | null
  custom_domain: string | null
  ga4_id: string | null
  fb_pixel_id: string | null
  intro_video_url: string | null
  social_links: Record<string, string> | null
  featured_listing_ids: number[] | null
  notification_email: string | null
  notification_phone: string | null
  fub_enabled: boolean
  ghl_enabled: boolean
  ghl_api_key: string | null
  lead_routing: Record<string, string> | null
  seo_noindex: boolean
  subarea_whitelist: string[] | null
  photo_fallback_url: string | null
  favicon_url: string | null
  designation: string | null
  /** Year the agent received their real estate licence (e.g. "2005"). */
  licensed_since?: string | null
  /** Languages the agent speaks (e.g. ["English", "Farsi"]). */
  languages?: string[] | null
  team_members: Array<{ name: string; title: string; phone: string; email: string; bio: string; photo: string | null }> | null
  achievements: Array<{ label: string }> | null
  co_agent_achievements: Record<string, Array<{ label: string }>> | null
  hero_stats?: {
    // ── Semantic fields (AI pipeline, data-driven) ──────────────────────────
    /** Total homes sold across all MLS history. */
    homes_sold?: number | null
    /** Average sold price across all MLS history (integer, dollars). */
    avg_sold_price?: number | null
    /** Total sales volume across all MLS history (integer, dollars). */
    total_volume?: number | null
    /** Number of currently active listings. */
    active_count?: number | null
    /** Top subareas served (derived from sold volume). */
    areas_served?: string[] | null
    /** Computed trust chips — [{label: "120+ Homes Sold"}, …] */
    trust_chips?: Array<TrustChipData | string>
    // ── Legacy manual-entry fields (stat1/stat2 format) ──────────────────────
    stat1_value?: string | null
    stat1_label?: string | null
    stat2_value?: string | null
    stat2_label?: string | null
    stat3_value?: string | null
    stat3_label?: string | null
    stat4_value?: string | null
    stat4_label?: string | null
    /** Old data may still be plain strings; API normalizes to objects, render code tolerates both. */
    highlights?: TrustChipData[]
    /** Years the agent has been actively selling — used by the site-wide value-prop/CTA block. */
    years_experience?: string | null
    /** Short first-person blurb shown in the site-wide value-prop/CTA block. */
    value_prop_blurb?: string | null
  } | null
  /** When true, the W4StickyFooter (fixed bottom contact/CTA bar) is hidden on every page. */
  disable_sticky_bar?: boolean | null
  /** Persisted JSON blob controlling layout/hero/nav/sections per site. Null → hub preset defaults. */
  site_config?: RawSiteConfig | null
  /** AI-generated area expertise blurbs, one per top neighbourhood derived from MLS sold history. */
  area_expertise?: Array<{
    subarea: string
    blurb: string
    sold_count: number
    avg_sold: number
  }> | null
  /**
   * Street/office address for the agent (e.g. "123 King George Blvd, Surrey, BC V3S 4C5").
   * When set, a PostalAddress node is included in the contact page JSON-LD schema.
   * Backend column not yet migrated — reads gracefully as null when absent.
   */
  office_address?: string | null
  /**
   * Custom response-time promise shown on the contact page (e.g. "within 2 hours").
   * Falls back to "promptly" when unset.
   * Backend column not yet migrated — reads gracefully as null when absent.
   */
  response_time?: string | null
}

/**
 * Co-agent(s) to display alongside the primary agent — e.g. Nav Shahram +
 * Reza Hedayat on the tricity dual-agent site. Only entries with a real
 * uploaded photo AND a name distinct from the primary agent are treated as
 * a "co-agent" — a nameless/photo-less team_members row (the common case for
 * single-agent sites like Randy) never triggers dual-agent rendering. This is
 * the single source of truth for "is this a dual-agent site" across the nav,
 * hero, sticky footer, about sections, and footer.
 */
export type CoAgent = { name: string; title: string; phone: string; email: string; bio: string; photo: string }

export function getCoAgents(agent: AgentProfile): Array<CoAgent> {
  const members = agent.settings?.team_members
  if (!Array.isArray(members)) return []
  return members
    .filter((m): m is typeof members[number] & { photo: string } =>
      !!m.photo && !!m.name && m.name.trim().toLowerCase() !== agent.name.trim().toLowerCase())
    .map(m => ({ name: m.name, title: m.title || agent.brokerage, phone: m.phone, email: m.email, bio: m.bio, photo: m.photo as string }))
}

/**
 * One real, verified price-reduction/sold narrative for a filtered listing page.
 * Never fabricated — the backend only returns a listing whose reduction count
 * comes from real price_history rows; returns null when no such listing exists.
 */
export interface PriceStory {
  mls_no: string
  slug: string | null
  address: string | null
  subarea: string | null
  status: 'Sold' | 'Active'
  original_price: number
  reduction_count: number
  final_price: number
}

/** A single trust-chip / highlight row: short text + a curated icon id (see lib/trust-icons.tsx). */
export interface TrustChipData {
  text: string
  icon?: string
}

export interface AgentTerritory {
  city: string
  subarea: string | null
}

export interface AgentTheme {
  primaryBg: string
  accent: string
  navBg: string
  brandText: string
  /** "0,0,0" for light brand bg, "255,255,255" for dark — use as rgba(var(--brand-overlay-rgb),X) */
  brandOverlayRgb: string
  /** primaryBg as "R,G,B" triplet — use as rgba(var(--brand-bg-rgb),X) for hero overlays */
  brandBgRgb: string
  /** accent as "R,G,B" triplet — use as rgba(var(--brand-accent-rgb),X) for alpha-blended accent tints */
  accentRgb: string
}

export interface AgentListing {
  id: number
  mls_no: string
  address: string
  city: string
  subarea: string | null
  status: 'Active' | 'Sold'
  list_price: number
  sold_price: number | null
  beds: number
  baths: number
  sqft: number
  photo_url: string | null
  type: string | null
  style: string | null
  slug: string | null
  dom: number | null
  lot_size?: number | string | null
  frontage?: number | string | null
  levels?: number | null
  sold_date?: string | null
  list_date?: string | null
  year_built?: number | null
  strata_fee?: number | null
  tax_amount?: number | null
  tax_year?: string | null
  listed_by?: string | null
  latitude?: number | null
  longitude?: number | null
  original_price?: number | null
  price_reduced?: boolean
  reduction_amount?: number
  basement?: string | null
  kitchens?: number | null
  rental_income_hint?: string | null
}

export interface AgentBuilding {
  id: string
  name: string
  slug: string
  city: string
  subarea: string | null
  year_built: number | null
  units: number | null
  levels: number | null
  strata_no: string | null
  street_no: string | null
  street_name: string | null
  street_type: string | null
  address: string | null
  postal_code: string | null
  status: string | null
  title_to_land: string | null
  construction?: string | null
  photo_url: string | null
  min_price: number | null
  max_price: number | null
  active_listings: number
}

// Some buildings have no name in the DB. When that happens, fall back to the
// street address (address minus the ", City" suffix) as the display name so
// nameless buildings never render a blank/broken name — many buyers search
// by street address anyway.
export function buildingDisplayName(building: { name?: string | null; address?: string | null; city?: string | null }): string {
  const name = (building.name || '').trim()
  if (name) return name
  const address = building.address || ''
  const city = building.city || ''
  const citySuffix = city ? `, ${city}` : ''
  return citySuffix && address.endsWith(citySuffix) ? address.slice(0, -citySuffix.length) : address
}

export function hasBuildingName(building: { name?: string | null }): boolean {
  return !!(building.name && building.name.trim())
}

export interface MarketStats {
  active_count: number
  avg_list_price: number | null
  sold_last_30_days: number
  avg_sold_price: number | null
  avg_dom: number | null
}

export interface AgentTestimonial {
  id: number
  name: string
  text: string
  rating: number
  source: string
  source_url: string | null
  date: string | null
}

export interface OpenHouse {
  start: string
  finish: string
}

export interface ListingBuildingRef {
  id: string
  name: string
  slug: string
}

export interface ListingDetail extends AgentListing {
  photos: string[]
  description: string | null
  features: string[]
  amenities: string[]
  parking: string | null
  basement: string | null
  lot_size: string | null
  tax_amount: number | null
  tax_year: string | null
  virtual_tour: string | null
  year_built: number | null
  strata_fee: number | null
  latitude: number | null
  longitude: number | null
  open_house: OpenHouse | null
  building: ListingBuildingRef | null
  building_solds_summary?: { count: number; avg_sold_price: number } | null
  building_active?: AgentListing[]
  similar_active: AgentListing[]
  similar_sold: AgentListing[]
  neighbourhood: NeighbourhoodWidget | null
  // Property attributes
  heating?: string | null
  kitchens?: number | null
  roof?: string | null
  strata_no?: string | null
  postal_code?: string | null
  complex?: string | null
  reno_year?: number | null
  units_in_development?: number | null
  units_in_strata?: number | null
  reoffice?: string | null
  frontage?: number | null
  depth?: number | null
  garage_size?: string | null
  // Floor area breakdown
  floor_area?: {
    main?: number | null
    above?: number | null
    below?: number | null
    basement?: number | null
    unfinished?: number | null
    total?: number | null
  } | null
  // Room sizes (dimensions login-gated on frontend)
  rooms?: Array<{ level: string; type: string | null; dim1: string | null; dim2: string | null }>
  baths_detail?: Array<{ level: string; ensuite: string | null; pieces: string | null }>
  // Price / listing history (entire section login-gated on frontend)
  price_history?: Array<{ date: string; mls: string; status: string; price: number }>
  listing_history?: Array<{ date: string; mls: string; status: string; price: number }>
  // Suite detection fields
  has_suite?: boolean
  suite_count?: number
  suite_label?: string | null
  legal_suite?: boolean
  rental_income_hint?: string | null
}

export interface BuildingStats {
  /** Sales in the last 12 months this aggregate is drawn from. Needed to tell a
   *  real average from a single sale masquerading as one - see sold/[mls]/page.tsx. */
  sold_count?: number | null
  sold_count_6m?: number | null
  expensive_sold: number | null
  avg_sold_price: number | null
  avg_dom: number | null
  avg_per_sqft: number | null
}

export interface Faq {
  q: string
  a: string
}

/** Agent FAQ from the agent_faqs table — question, answer, and display order. */
export interface AgentFaq {
  question: string
  answer: string
  sort_order: number
}

export interface SiblingBuilding {
  id: string
  name: string
  slug: string
  address: string
  year_built: number | null
  units: number | null
  active_listings_count: number
}

export interface NearbyBuilding {
  id: string
  name: string
  slug: string
  address: string
  year_built: number | null
  levels: number | null
  active_listings_count: number
}

export interface BuildingFeaturesSection {
  title: string
  items: string[]
}

export interface BuildingFeaturesData {
  type: 'tags' | 'sections'
  items?: string[]
  sections?: BuildingFeaturesSection[]
}

export interface BuildingAgentTake {
  desirability: string | null
  buyer_profile: string | null
  common_problems: string | null
  value_take: string | null
  best_floorplans: string | null
  view_preference: string | null
  noise_notes: string | null
  rental_pet_appeal: string | null
}

export interface BuildingDetail {
  id: string
  name: string
  slug: string
  city: string
  subarea: string | null
  year_built: number | null
  units: number | null
  units_in_strata: number | null
  strata_no: string | null
  mgmt_name: string | null
  construction: string | null
  levels: number | null
  complex_name: string | null
  bylaw_restrictions: string | null
  description: string | null
  tagline: string | null
  neighbourhood_context: string | null
  meta_description: string | null
  faq_json: string | null
  agent_take: BuildingAgentTake | null
  maintenance_fee_includes: string[]
  photo_url: string | null
  photos: string[]
  amenities: string[]
  features: string[]
  features_data: BuildingFeaturesData | null
  no_pets: boolean
  dogs_allowed: boolean
  cats_allowed: boolean
  latitude: number | null
  longitude: number | null
  address: string
  active_listings: AgentListing[]
  recent_sold: AgentListing[]
  stats: BuildingStats & { sold_count_6m?: number | null } | null
  faqs: Faq[]
  sibling_buildings: SiblingBuilding[]
  nearby_buildings: NearbyBuilding[]
  walk_score: number | null
  transit_score: number | null
  bike_score: number | null
  developer: string | null
  suite_sizes: string | null
  agent_sold_count?: number | null
}

export type MarketType = 'strong-sellers' | 'sellers' | 'balanced' | 'buyers'

export interface NeighbourhoodSummary {
  name: string
  city: string
  subarea: string | null
  slug: string
  active_count: number
  sold_30d?: number
  avg_sold_price?: number
  avg_dom?: number
  avg_per_sqft?: number | null
  absorption_rate?: number
  market_type?: MarketType
  description?: string | null
}

export interface NeighbourhoodWidget {
  subarea?: string
  city?: string
  active: number
  sold_30d: number
  avg_sold_price: number
  avg_list_price?: number
  avg_dom: number
  absorption_rate: number
  market_type: MarketType
  sale_to_list?: number
}

export interface MonthlyTrendPoint {
  month: string
  sold: number
  active?: number
  avg_price: number
  avg_dom: number
  avg_ppsf: number
  avg_list_price?: number
}

export interface NeighbourhoodTypeSection {
  type: 'Apartment' | 'Townhouse' | 'House' | 'Duplex'
  widget: NeighbourhoodWidget
  active: AgentListing[]
  recent_sold: AgentListing[]
}

export interface NeighbourhoodPulseType {
  type: string
  count_90d: number
  avg_sold_price_90d: number
  avg_dom_90d: number
  avg_ppsf_90d: number
}

export interface NeighbourhoodAgeBuckets {
  new_count: number
  mid_count: number
  est_count: number
  new_pct: number
  mid_pct: number
  est_pct: number
}

export interface NeighbourhoodPulse {
  activity_score: number
  activity_label: string
  by_type: NeighbourhoodPulseType[]
  age_buckets: NeighbourhoodAgeBuckets
}

export interface NeighbourhoodDetail {
  name: string
  city: string
  subarea: string | null
  description: string | null
  widget: NeighbourhoodWidget | null
  by_type?: NeighbourhoodTypeSection[]
  monthly_trend: MonthlyTrendPoint[]
  active: AgentListing[]
  recent_sold: AgentListing[]
  pulse?: NeighbourhoodPulse
  lifestyle_body?: string | null
  pulse_body?: string | null
  pulse_generated_at?: string | null
}

export interface SchoolCatchmentSummary {
  name: string
  slug: string
  school_type: string | null
  city: string
  district_name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  active_count: number
  has_boundary: boolean
}

export interface SchoolCatchmentDetail {
  school: {
    name: string
    slug: string
    school_type: string | null
    city: string
    district_name: string | null
    address: string | null
    latitude: number | null
    longitude: number | null
  }
  has_boundary: boolean
  active: AgentListing[]
  recent_sold: AgentListing[]
  active_count: number
  sold_count: number
  avg_list_price: number | null
  avg_sold_price: number | null
  avg_sold_psf: number | null
}

export interface MarketSummary {
  active: number
  sold_30d: number
  avg_sold_price: number
  avg_dom: number
  absorption_rate: number
  market_type: MarketType
}

export interface MarketReportTypeRow extends MarketSummary {
  type: string
}

export interface MonthlyTypePricePoint {
  month: string
  apartment: number | null
  townhouse: number | null
  house: number | null
  duplex?: number | null
  apartment_sold?: number | null
  townhouse_sold?: number | null
  house_sold?: number | null
  duplex_sold?: number | null
  apartment_dom?: number | null
  townhouse_dom?: number | null
  house_dom?: number | null
  duplex_dom?: number | null
  apartment_ppsf?: number | null
  townhouse_ppsf?: number | null
  house_ppsf?: number | null
  duplex_ppsf?: number | null
}

export interface MarketReport {
  overall: MarketSummary
  by_type: MarketReportTypeRow[]
  monthly_trend: MonthlyTrendPoint[]
  monthly_trend_by_type: MonthlyTypePricePoint[]
}

export interface BoardMarketReport {
  board: string
  board_label: string
  city: string
  type: string
  has_data: boolean
  overall: {
    active: number
    sold_30d: number
    median_sold_price: number
    sale_to_list: number
    avg_dom: number
    absorption_rate: number
    market_type: MarketType
  }
  by_type: MarketReportTypeRow[]
  monthly_trend: MonthlyTrendPoint[]
  monthly_trend_by_type: MonthlyTypePricePoint[]
}

export interface BoardCitiesResponse {
  board: string
  label: string
  cities: string[]
}

export interface AgentPage {
  slug: string
  title: string | null
  subtitle: string | null
  hero_image_url: string | null
  body: string | null
  blocks: unknown[]
  cta_label: string | null
  cta_url: string | null
  meta_title: string | null
  meta_description: string | null
}

export interface AgentAward {
  id: number
  title: string
  organization: string | null
  year: string | null
  logo_url: string | null
  description: string | null
}

export interface AgentMedia {
  id: number
  type: string
  collection: string | null
  url: string
  thumbnail_url: string | null
  caption: string | null
  alt: string | null
}

export interface TopRealtor {
  agent: AgentProfile
  sold_count: number
  sold_volume: number | null
  avg_dom: number | null
  active_count: number
  awards: AgentAward[]
}

export interface LandingPageValueCard {
  emoji: string
  heading: string
  copy: string
}

export interface LandingPageTestimonial {
  quote: string
  name: string
  city: string
}

export interface LandingPage {
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
  value_prop_cards: LandingPageValueCard[]
  testimonials: LandingPageTestimonial[]
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface AgentSoldStatCity {
  name: string
  sold_count: number
  total_volume: number
  avg_price: number
  avg_ratio: number
}

export interface AgentSoldStats {
  sold_count: number
  total_volume: number
  avg_sale_to_list: number
  best_sale_to_list: number
  years: number
  cities: AgentSoldStatCity[]
}

export interface AreaComparison {
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

export interface BestOfListItem {
  slug: string
  label: string
  type: 'building' | 'area'
  blurb: string
  image_url?: string | null
}

export interface BestOfList {
  id: number
  agent_id: number
  slug: string
  title: string
  intro: string
  kind: 'building' | 'area'
  items: BestOfListItem[]
  status: 'draft' | 'published'
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface HomeData {
  agent: AgentProfile
  page: AgentPage | null
  listings: AgentListing[]
  buildings: AgentBuilding[]
  stats: MarketStats
  testimonials: AgentTestimonial[]
  awards: AgentAward[]
}

/**
 * A single row from `agent_buyer_solds` as returned by the admin list endpoint.
 */
export interface BuyerSold {
  id: number
  agent_id: number
  address_raw: string
  mls_id: string | null
  is_private_sale: boolean
  ai_confidence: 'high' | 'medium' | 'low' | 'none' | null
  ai_reason: string | null
  notes: string | null
  status: 'pending' | 'confirmed' | 'hidden'
  created_at: string
  updated_at: string
}

/**
 * One result row from the AI matching pipeline (POST /api/.../buyer-solds/match).
 * Returned for staff review before saving.
 */
export interface BuyerSoldMatch {
  raw: string
  normalized: {
    unit: string | null
    street_no: string
    street: string
    city: string
    is_private_sale: boolean
  } | null
  mls_id: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  reason: string
  candidate: {
    mls_id: string
    address: string
    city: string
    sold_price: number | null
    sold_date: string | null
  } | null
}

/**
 * A unified sold item — either a listing-side sold or a buyer-represented sold.
 * Returned by GET /api-internal/agent/{slug}/buyer-solds.
 */
export interface UnifiedSold {
  role: 'listing' | 'buyer'
  mls_id: string | null
  address: string | null
  city: string | null
  sold_price: number | null
  sold_date: string | null
  type: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  photo_url: string | null
  is_private_sale: boolean
}

export interface UnifiedSoldsResponse {
  items: UnifiedSold[]
  total_count: number
  total_volume: number
  page: number
  limit: number
}

export interface TeamMember {
  id: number
  name: string
  role: string
  photo_url: string | null
  bio: string | null
  phone: string | null
  email: string | null
  license: string | null
}

export interface NewsPost {
  id: number
  slug: string
  title: string
  excerpt: string | null
  body: string | null
  photo_url: string | null
  published_at: string
  category: string | null
  tags: string[]
}

export interface NewsList {
  posts: NewsPost[]
  total: number
}

export interface OpenHouseItem extends AgentListing {
  open_house: { start: string; finish: string }
}

export interface PriceMatrixRow {
  type: string
  beds: number | null
  avg_price: number
  avg_ppsf: number | null
  count: number
  avg_dom: number | null
}

export interface PriceMatrix {
  rows: PriceMatrixRow[]
  generated_at: string
}

export interface MarketBreakdownBedroom {
  beds: number
  avg_sold_price: number
  sold_30d: number
  avg_dom: number
}

export interface MarketBreakdownBathroom {
  baths: number
  avg_sold_price: number
  sold_30d: number
  avg_dom: number
}

export interface MarketBreakdownDecade {
  decade: string
  avg_sold_price: number
  sold_30d: number
  avg_dom: number
}

export interface MarketBreakdownLotSize {
  band: string
  avg_sold_price: number
  sold_30d: number
  avg_dom: number
}

export interface MarketBreakdownLevels {
  levels: string
  avg_sold_price: number
  sold_30d: number
  avg_dom: number
}

export interface MarketBreakdown {
  by_bedroom: MarketBreakdownBedroom[]
  by_bathroom: MarketBreakdownBathroom[]
  by_decade: MarketBreakdownDecade[]
  by_lot_size: MarketBreakdownLotSize[]
  by_levels: MarketBreakdownLevels[]
}

export interface BuyerPersonaContent {
  best_for: string[]
  pros: string[]
  personas?: string[]
  excerpt?: string | null
}

export interface NeighbourhoodAiContent {
  buyer_personas: BuyerPersonaContent | null
  lifestyle_seo: string | null
}

export interface AreaIntroContent {
  content: string
}

/** Parse a 3- or 6-digit hex string (#rgb or #rrggbb) into [r, g, b] 0-255. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ]
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** WCAG relative luminance of a hex colour. Returns 0 (black) – 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function resolveTheme(agent: AgentProfile): AgentTheme {
  const primaryBg = agent.primary_bg_color || '#111111'
  const isLightBg = relativeLuminance(primaryBg) > 0.179
  const [r, g, b] = hexToRgb(primaryBg.replace('#', ''))
  const accentHex = (agent.theme_color || '#111111').replace('#', '')
  const [ar, ag, ab] = hexToRgb(accentHex)
  return {
    primaryBg,
    accent: agent.theme_color || '#111111',
    navBg: primaryBg,
    brandText: agent.brand_text_color || '#ffffff',
    brandOverlayRgb: isLightBg ? '0,0,0' : '255,255,255',
    brandBgRgb: `${r},${g},${b}`,
    accentRgb: `${ar},${ag},${ab}`,
  }
}

export const IMAGE_SERVER = 'https://media.pixilinkserver.com'
export const STORAGE_BASE = 'https://website.pixilink.com'

// TODO: WebP delivery — media.pixilinkserver.com handles ?w= and &h= resize params but does
// not appear to support a ?format=webp (or &f=webp / &fm=webp) query parameter for on-the-fly
// format conversion. Probing the CDN root returns text/plain regardless of format params,
// and no real image path is available at build time to confirm. When a server-side image proxy
// is added (e.g. a Next.js /api/img route that fetches from the CDN and re-encodes), add
// Accept: image/webp detection here and route through the proxy.
export function imgUrl(path: string | null, w: 325 | 400 | 600 | 800 | 900 | 1600, h?: number): string {
  if (!path) return ''
  // /api/storage/ is a Laravel API route — keep as an absolute URL via STORAGE_BASE
  if (path.startsWith('/api/storage/')) return `${STORAGE_BASE}${path}`
  // /storage/ paths are Apache-served static files — prepend public origin.
  if (path.startsWith('/storage/')) return `${STORAGE_BASE}${path}`
  // https://website.pixilink.com/storage/ is a public Apache-served URL —
  // pass through as-is (port 8082 bridge only handles PHP, not static files).
  if (path.startsWith('https://website.pixilink.com/storage/')) return path
  // URLs already on the Pixilink media CDN — append resize params directly
  if (path.startsWith(IMAGE_SERVER)) return `${path}?w=${w}${h ? `&h=${h}` : ''}`
  // Other absolute URLs (external hosting) — pass through as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Relative paths — prepend CDN origin + resize params
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${IMAGE_SERVER}${cleanPath}?w=${w}${h ? `&h=${h}` : ''}`
}

/** Returns the original CDN URL without any resize query params — use for lightbox full-size display. */

/**
 * The URL of a listing's second MLS photo, derived from the first.
 *
 * The list endpoints return a single photo_url, and fetching a listing's full photo set
 * costs one imageXML request each — far too much for a grid. The CDN names photos
 * predictably though (…/R3004528-1.jpg, -2.jpg, …), so the second can be derived.
 *
 * This is a guess: a listing with one photo has no -2. Callers must therefore use it
 * somewhere a miss is invisible — a CSS background-image, never an <img>, because a
 * background that 404s simply does not paint while a broken <img> shows an icon.
 *
 * Returns null when the path does not end in the expected -N.ext form.
 */
export function secondPhotoUrl(path: string | null): string | null {
  if (!path) return null
  const base = path.split('?')[0]
  const m = base.match(/^(.*-)(\d+)(\.[a-zA-Z]+)$/)
  if (!m) return null
  const [, prefix, num, ext] = m
  // Only step off the FIRST photo. Deriving -3 from -2 would be a second guess layered
  // on a first, and the caller only ever wants the pair.
  if (num !== '1') return null
  return `${prefix}2${ext}`
}
export function imgUrlFull(path: string | null): string {
  if (!path) return ''
  if (path.startsWith('/api/storage/') || path.startsWith('/storage/')) return `${STORAGE_BASE}${path}`
  // Already on CDN — strip any ?w=/&h= resize params appended by imgUrl
  if (path.startsWith(IMAGE_SERVER)) {
    const qIdx = path.indexOf('?')
    return qIdx !== -1 ? path.slice(0, qIdx) : path
  }
  // Other absolute URLs — pass through as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Relative paths — prepend CDN origin; strip any stray query string from the path itself
  const withSlash = path.startsWith('/') ? path : `/${path}`
  const qIdx = withSlash.indexOf('?')
  const basePath = qIdx !== -1 ? withSlash.slice(0, qIdx) : withSlash
  return `${IMAGE_SERVER}${basePath}`
}

export function formatPrice(p: number | null): string {
  if (!p) return 'Contact'
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  return `$${(p / 1000).toFixed(0)}K`
}

export function formatPriceRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Contact for pricing'
  if (min && max) return `${formatPrice(min)} – ${formatPrice(max)}`
  if (min) return `From ${formatPrice(min)}`
  return `To ${formatPrice(max!)}`
}

export function formatPriceFull(p: number | null | undefined): string {
  if (!p) return 'Contact'
  return `$${Math.round(p).toLocaleString('en-CA')}`
}

export function pricePerSqft(price: number | null | undefined, sqft: number | null | undefined): string | null {
  if (!price || !sqft || sqft <= 0) return null
  return `$${Math.round(price / sqft).toLocaleString('en-CA')}`
}

export function formatDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', opts)
}

/**
 * Extracts the agent's headline credential/award text strings from `hero_stats`.
 * Prefers `highlights` (richer, curated copy); falls back to `trust_chips` text
 * when there are no highlights. Returns an empty array when the agent has
 * neither — callers should omit the field entirely rather than emit empty data.
 * Shared by the RealEstateAgent JSON-LD `award` field and the llms.txt builder
 * so both machine-readable surfaces stay in sync with the same admin data.
 */
export function getHeroCredentials(agent: Pick<AgentProfile, 'settings'> | null | undefined): string[] {
  const hs = agent?.settings?.hero_stats
  if (!hs) return []
  const fromHighlights = (hs.highlights ?? [])
    .map(h => h.text)
    .filter((t): t is string => !!t && t.trim().length > 0)
  if (fromHighlights.length) return fromHighlights
  return (hs.trust_chips ?? [])
    .map(chip => (typeof chip === 'string' ? chip : chip.text))
    .filter((t): t is string => !!t && t.trim().length > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Site Configuration System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw site_config blob as stored in agent_settings (LONGTEXT, JSON-encoded).
 * All fields are optional — null/undefined means "use preset default".
 */
export interface RawSiteConfig {
  layout_preset?: 'hub' | 'showcase' | 'minimal'
  nav_style?: 'centered' | 'dark-bar' | 'transparent-hero' | 'minimal'
  hero_style?: 'full-bleed' | 'split' | 'circle-centered' | 'text-only' | 'photo-strip'
  /** Hero design variant for the Showcase preset. Defaults to 'split' when absent. */
  showcase_hero_style?: 'split' | 'fullbleed-cinematic' | 'editorial-stack'
  font_pair?: 'serif-sans' | 'all-sans' | 'geometric'
  palette?: 'light' | 'dark'
  /**
   * Days-on-market threshold for suppressing the DOM badge on ListingCard.
   * Listings with dom > this value will not show the "Xd on market" badge.
   * Default (when absent): 180 days.
   */
  hideStaleDaysOnMarket?: number | null
  sections?: Partial<{
    achievements: boolean
    sold_gallery: boolean
    buildings: boolean
    testimonials: boolean | 'strip' | 'cards'
    market_reports: boolean
    blog: boolean
    cta_home_eval: boolean
    /** Credentials ribbon (licensed_since, brokerage, license_number, languages) below hero. */
    credentials: boolean
    /** Agent FAQ prose section — crawler-readable Q&A, not accordion. */
    faqs: boolean
  }>
}

export interface ResolvedSiteConfig {
  layout_preset: 'hub' | 'showcase' | 'minimal'
  nav_style: 'centered' | 'dark-bar' | 'transparent-hero' | 'minimal'
  hero_style: 'full-bleed' | 'split' | 'circle-centered' | 'text-only' | 'photo-strip'
  /** Hero design variant for the Showcase preset. Default: 'split'. */
  showcase_hero_style: 'split' | 'fullbleed-cinematic' | 'editorial-stack'
  font_pair: 'serif-sans' | 'all-sans' | 'geometric'
  palette: 'light' | 'dark'
  sections: {
    achievements: boolean
    sold_gallery: boolean
    buildings: boolean
    testimonials: false | 'strip' | 'cards'
    market_reports: boolean
    blog: boolean
    cta_home_eval: boolean
    credentials: boolean
    faqs: boolean
  }
}

const PRESET_DEFAULTS: Record<'hub' | 'showcase' | 'minimal', Omit<ResolvedSiteConfig, 'layout_preset'>> = {
  hub: {
    nav_style: 'dark-bar',
    hero_style: 'full-bleed',
    showcase_hero_style: 'split',
    font_pair: 'serif-sans',
    palette: 'dark',
    sections: {
      achievements: false,
      sold_gallery: false,
      buildings: true,
      testimonials: 'strip',
      market_reports: true,
      blog: false,
      cta_home_eval: true,
      credentials: false,
      faqs: false,
    },
  },
  showcase: {
    nav_style: 'dark-bar',
    hero_style: 'split',
    showcase_hero_style: 'split',
    font_pair: 'serif-sans',
    palette: 'light',
    sections: {
      achievements: true,
      sold_gallery: true,
      buildings: false,
      testimonials: 'cards',
      market_reports: false,
      blog: true,
      cta_home_eval: true,
      credentials: true,
      faqs: true,
    },
  },
  minimal: {
    nav_style: 'minimal',
    hero_style: 'text-only',
    showcase_hero_style: 'split',
    font_pair: 'all-sans',
    palette: 'light',
    sections: {
      achievements: false,
      sold_gallery: false,
      buildings: false,
      testimonials: false,
      market_reports: false,
      blog: false,
      cta_home_eval: true,
      credentials: false,
      faqs: false,
    },
  },
}

/**
 * Resolves a fully-typed site config for the given agent, applying preset
 * defaults and then merging any per-agent overrides. Null/missing site_config
 * → "hub" preset (backward-compatible with all existing agents).
 */
const VALID_PRESETS = ['hub', 'showcase', 'minimal'] as const
const VALID_NAV_STYLES = ['centered', 'dark-bar', 'transparent-hero', 'minimal'] as const
const VALID_HERO_STYLES = ['full-bleed', 'split', 'circle-centered', 'text-only', 'photo-strip'] as const
const VALID_SHOWCASE_HERO_STYLES = ['split', 'fullbleed-cinematic', 'editorial-stack'] as const
const VALID_FONT_PAIRS = ['serif-sans', 'all-sans', 'geometric'] as const
const VALID_PALETTES = ['light', 'dark'] as const
type ValidPreset = typeof VALID_PRESETS[number]

function safeEnum<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

export function resolveSiteConfig(agent: Pick<AgentProfile, 'settings'>): ResolvedSiteConfig {
  const raw = agent.settings?.site_config ?? null
  const preset = safeEnum(raw?.layout_preset, VALID_PRESETS, 'hub')
  const base = PRESET_DEFAULTS[preset]

  const rawTestimonials = raw?.sections?.testimonials
  let testimonials: false | 'strip' | 'cards'
  if (rawTestimonials === undefined) {
    testimonials = base.sections.testimonials
  } else if (rawTestimonials === false || rawTestimonials === null) {
    testimonials = false
  } else if (rawTestimonials === true) {
    testimonials = 'strip'
  } else {
    testimonials = safeEnum(rawTestimonials, ['strip', 'cards'] as const, 'strip')
  }

  return {
    layout_preset: preset,
    nav_style: safeEnum(raw?.nav_style, VALID_NAV_STYLES, base.nav_style),
    hero_style: safeEnum(raw?.hero_style, VALID_HERO_STYLES, base.hero_style),
    showcase_hero_style: safeEnum(raw?.showcase_hero_style, VALID_SHOWCASE_HERO_STYLES, 'split'),
    font_pair: safeEnum(raw?.font_pair, VALID_FONT_PAIRS, base.font_pair),
    palette: safeEnum(raw?.palette, VALID_PALETTES, base.palette),
    sections: {
      achievements: raw?.sections?.achievements ?? base.sections.achievements,
      sold_gallery: raw?.sections?.sold_gallery ?? base.sections.sold_gallery,
      buildings: raw?.sections?.buildings ?? base.sections.buildings,
      testimonials,
      market_reports: raw?.sections?.market_reports ?? base.sections.market_reports,
      blog: raw?.sections?.blog ?? base.sections.blog,
      cta_home_eval: raw?.sections?.cta_home_eval ?? base.sections.cta_home_eval,
      credentials: raw?.sections?.credentials ?? base.sections.credentials,
      faqs: raw?.sections?.faqs ?? base.sections.faqs,
    },
  }
}
