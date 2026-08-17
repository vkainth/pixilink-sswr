/**
 * Shared persona taxonomy for AI-tagged buildings & listings.
 *
 * This is the single source of truth for persona slugs, their qualifying
 * tags, and the display copy used to render the reusable persona hub/area
 * page templates under `/agent/[slug]/persona/[persona]`.
 *
 * IMPORTANT: `tags` here must stay in sync with the server-side allowlists
 * (`personaTagAllowlist()` / `personaGroups()` in the prod AgentDataController)
 * — see `.local/recovery/AgentDataController.lean_latest.php`.
 */

export interface PersonaConfig {
  slug: string
  label: string
  eyebrow: string
  h1: string
  description: string
  metaTitle: string
  metaDesc: string
  tags: string[]
  /** Short factual blurbs shown as the intro cards on the hub page. */
  highlights: { title: string; body: string }[]
}

export const PERSONAS: Record<string, PersonaConfig> = {
  'downsizer-homes': {
    slug: 'downsizer-homes',
    label: 'Downsizers',
    eyebrow: 'Right-Sized Living',
    h1: 'Homes for Downsizers',
    description:
      'Browse homes built for easier living — elevator buildings, one-level layouts, age-55+ communities, low strata fees, and pet-friendly small complexes.',
    metaTitle: 'Homes for Downsizers | One-Level Living & 55+ Communities',
    metaDesc:
      'Find homes made for downsizing — elevator access, one-level living, 55+ communities, low strata fees, and small pet-friendly complexes. Live MLS® listings.',
    tags: ['elevator', 'one-level-living', 'age-55-plus', 'low-strata-fee', 'small-complex', 'pet-friendly'],
    highlights: [
      { title: 'One-Level Living', body: 'No stairs to manage — main-floor primary bedrooms and elevator-served suites.' },
      { title: 'Lower Carrying Costs', body: 'Low strata fees and smaller, well-managed complexes mean fewer surprises.' },
      { title: 'Age-Qualified Communities', body: '55+ buildings with quieter, low-maintenance lifestyles and pet-friendly bylaws.' },
    ],
  },
  'luxury-finishes-homes': {
    slug: 'luxury-finishes-homes',
    label: 'Luxury Finishes',
    eyebrow: 'Elevated Interiors',
    h1: 'Homes with Luxury Finishes',
    description:
      'Browse homes featuring custom millwork, designer kitchens, spa-style ensuites, and high-end renovations throughout.',
    metaTitle: 'Homes with Luxury Finishes | Custom Millwork & Designer Kitchens',
    metaDesc:
      'Search homes with luxury finishes — custom millwork, designer kitchens, spa ensuites, and high-end renovations. Live MLS® listings updated daily.',
    tags: ['luxury-finishes', 'custom-millwork', 'spa-ensuite', 'high-end-renovation', 'designer-kitchen'],
    highlights: [
      { title: 'Designer Kitchens', body: 'Custom cabinetry, waterfall islands, and premium countertop materials.' },
      { title: 'Spa-Style Ensuites', body: 'Freestanding tubs, rain showers, and heated floors in the primary bathroom.' },
      { title: 'Custom Millwork', body: 'Built-ins, coffered ceilings, and detailed trim work throughout the home.' },
    ],
  },
  'high-end-appliance-homes': {
    slug: 'high-end-appliance-homes',
    label: 'High-End Appliances',
    eyebrow: 'Chef-Grade Kitchens',
    h1: 'Homes with High-End Appliances',
    description:
      'Browse homes with premium appliance packages from Sub-Zero, Wolf, Viking, Miele, Thermador, Fisher & Paykel, and Bosch.',
    metaTitle: 'Homes with High-End Appliances | Sub-Zero, Wolf, Miele & More',
    metaDesc:
      'Search homes featuring premium appliance brands — Sub-Zero, Wolf, Viking, Miele, Thermador, Fisher & Paykel, Bosch. Live MLS® listings.',
    tags: ['high-end-appliances', 'sub-zero', 'wolf', 'viking', 'miele', 'thermador', 'fisher-paykel', 'bosch'],
    highlights: [
      { title: 'Premium Brands', body: 'Sub-Zero refrigeration, Wolf ranges, and Viking cooking suites.' },
      { title: 'European Craftsmanship', body: 'Miele, Thermador, and Bosch appliance packages built to last.' },
      { title: 'Chef-Grade Kitchens', body: 'Full professional-grade appliance suites for serious home cooks.' },
    ],
  },
}

export const PERSONA_SLUGS = Object.keys(PERSONAS)

export function getPersona(slug: string): PersonaConfig | null {
  return PERSONAS[slug] ?? null
}
