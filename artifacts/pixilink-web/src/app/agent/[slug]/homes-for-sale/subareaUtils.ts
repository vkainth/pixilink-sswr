// Pure subarea slug ↔ MLS label utilities — importable by both server and client components.
//
// Source-of-truth territory list:
//   Production DB — bccondosandhomes.agent_territories (city+subarea rows per agent)
//   and bccondosandhomes.agent_settings.subarea_whitelist (JSON array of MLS subarea labels).
//   Run on server: mysql … bccondosandhomes -e "SELECT city,subarea FROM agent_territories WHERE agent_id=…"
//   and: mysql … -e "SELECT subarea_whitelist FROM agent_settings WHERE agent_id=…"
// When adding a new agent or subarea, update BOTH this file and middleware.ts SUBAREA_SLUG_MAP.

export const SUBAREA_MAP: Array<{ slug: string; mlsLabel: string; displayName: string }> = [
  { slug: 'white-rock',           mlsLabel: 'White Rock',              displayName: 'White Rock' },
  // Live MLS label now has a trailing period on all Active rows (confirmed July 2026);
  // the no-period variant only exists on Sold/Expired/Terminated rows. Keeping both
  // entries below (dotted first) means fromSubareaSlug() queries the live label while
  // toSubareaSlug()/subareaDisplayName()/normalizeToSubareaSlug() still resolve old
  // no-period bookmarks/links to the same slug/display name instead of falling through
  // to the raw MLS code.
  { slug: 'crescent-beach',       mlsLabel: 'Crescent Bch Ocean Pk.',  displayName: 'Crescent Beach' },
  { slug: 'crescent-beach',       mlsLabel: 'Crescent Bch Ocean Pk',   displayName: 'Crescent Beach' },
  { slug: 'crescent-bch-ocean-pk', mlsLabel: 'Crescent Bch Ocean Pk.', displayName: 'Crescent Beach' },
  { slug: 'elgin-chantrell',      mlsLabel: 'Elgin Chantrell',         displayName: 'Elgin Chantrell' },
  { slug: 'grandview-surrey',     mlsLabel: 'Grandview Surrey',        displayName: 'Grandview Surrey' },
  // displayName differs from mlsLabel — DB territory uses "Grandview Heights", MLS uses "Grandview Surrey"
  { slug: 'grandview-heights',    mlsLabel: 'Grandview Surrey',        displayName: 'Grandview Heights' },
  { slug: 'morgan-creek',         mlsLabel: 'Morgan Creek',            displayName: 'Morgan Creek' },
  { slug: 'sunnyside-park',         mlsLabel: 'Sunnyside Park Surrey',   displayName: 'Sunnyside Park' },
  // Backend neighbourhood slug alias — matches KNOWN_NEIGHBOURHOOD_SLUGS in api.ts
  { slug: 'sunnyside-park-surrey',  mlsLabel: 'Sunnyside Park Surrey',   displayName: 'Sunnyside Park' },
  { slug: 'king-george-corridor', mlsLabel: 'King George Corridor',    displayName: 'King George Corridor' },
  { slug: 'pacific-douglas',      mlsLabel: 'Pacific Douglas',         displayName: 'Pacific Douglas' },
  { slug: 'rosemary-heights',     mlsLabel: 'Rosemary Hgts',           displayName: 'Rosemary Heights' },
  { slug: 'hazelmere',            mlsLabel: 'Hazelmere',               displayName: 'Hazelmere' },
  // MLS label is "Ocean Park Surrey" (per agent_settings subarea_whitelist); 0 active MLS rows currently
  { slug: 'ocean-park',           mlsLabel: 'Ocean Park Surrey',       displayName: 'Ocean Park' },
  { slug: 'semiahmoo',            mlsLabel: 'Semiahmoo',               displayName: 'Semiahmoo' },
  { slug: 'fleetwood-tynehead',   mlsLabel: 'Fleetwood Tynehead',      displayName: 'Fleetwood Tynehead' },
  { slug: 'clayton',              mlsLabel: 'Clayton',                  displayName: 'Clayton' },
  { slug: 'brookswood',           mlsLabel: 'Brookswood Langley',      displayName: 'Brookswood' },
  { slug: 'south-surrey',           mlsLabel: 'South Surrey White Rock', displayName: 'South Surrey' },
  // Backend neighbourhood slug aliases — match KNOWN_NEIGHBOURHOOD_SLUGS in api.ts
  { slug: 'south-surrey-white-rock', mlsLabel: 'South Surrey White Rock', displayName: 'South Surrey White Rock' },
  { slug: 'fleetwood',              mlsLabel: 'Fleetwood Tynehead',     displayName: 'Fleetwood' },
  { slug: 'cloverdale',             mlsLabel: 'Cloverdale',             displayName: 'Cloverdale' },
  { slug: 'whalley',                mlsLabel: 'Whalley',                displayName: 'Whalley' },
  { slug: 'east-newton',            mlsLabel: 'East Newton',            displayName: 'East Newton' },
  { slug: 'fraser-heights',         mlsLabel: 'Fraser Heights',         displayName: 'Fraser Heights' },
  // ── Coquitlam (Tri-Cities — Nav Shahram / Reza Hedayat) ─────────────────
  { slug: 'burke-mountain',       mlsLabel: 'Burke Mountain',          displayName: 'Burke Mountain' },
  { slug: 'canyon-springs',       mlsLabel: 'Canyon Springs',          displayName: 'Canyon Springs' },
  { slug: 'cape-horn',            mlsLabel: 'Cape Horn',               displayName: 'Cape Horn' },
  { slug: 'central-coquitlam',    mlsLabel: 'Central Coquitlam',       displayName: 'Central Coquitlam' },
  { slug: 'chineside',            mlsLabel: 'Chineside',               displayName: 'Chineside' },
  { slug: 'coquitlam-east',       mlsLabel: 'Coquitlam East',          displayName: 'Coquitlam East' },
  { slug: 'coquitlam-west',       mlsLabel: 'Coquitlam West',          displayName: 'Coquitlam West' },
  { slug: 'eagle-ridge-cq',       mlsLabel: 'Eagle Ridge CQ',          displayName: 'Eagle Ridge CQ' },
  { slug: 'harbour-chines',       mlsLabel: 'Harbour Chines',          displayName: 'Harbour Chines' },
  { slug: 'harbour-place',        mlsLabel: 'Harbour Place',           displayName: 'Harbour Place' },
  { slug: 'hockaday',             mlsLabel: 'Hockaday',                displayName: 'Hockaday' },
  { slug: 'maillardville',        mlsLabel: 'Maillardville',           displayName: 'Maillardville' },
  { slug: 'meadow-brook',         mlsLabel: 'Meadow Brook',            displayName: 'Meadow Brook' },
  { slug: 'new-horizons',         mlsLabel: 'New Horizons',            displayName: 'New Horizons' },
  { slug: 'north-coquitlam',      mlsLabel: 'North Coquitlam',         displayName: 'North Coquitlam' },
  { slug: 'park-ridge-estates',   mlsLabel: 'Park Ridge Estates',      displayName: 'Park Ridge Estates' },
  { slug: 'ranch-park',           mlsLabel: 'Ranch Park',              displayName: 'Ranch Park' },
  { slug: 'river-springs',        mlsLabel: 'River Springs',           displayName: 'River Springs' },
  { slug: 'scott-creek',          mlsLabel: 'Scott Creek',             displayName: 'Scott Creek' },
  { slug: 'summitt-view',         mlsLabel: 'Summitt View',            displayName: 'Summitt View' },
  { slug: 'upper-eagle-ridge',    mlsLabel: 'Upper Eagle Ridge',       displayName: 'Upper Eagle Ridge' },
  { slug: 'westwood-plateau',     mlsLabel: 'Westwood Plateau',        displayName: 'Westwood Plateau' },
  // ── Port Coquitlam (Tri-Cities) ──────────────────────────────────────────
  { slug: 'birchland-manor',      mlsLabel: 'Birchland Manor',         displayName: 'Birchland Manor' },
  { slug: 'central-pt-coquitlam', mlsLabel: 'Central Pt Coquitlam',   displayName: 'Central Pt Coquitlam' },
  { slug: 'citadel-pq',           mlsLabel: 'Citadel PQ',              displayName: 'Citadel PQ' },
  { slug: 'glenwood-pq',          mlsLabel: 'Glenwood PQ',             displayName: 'Glenwood PQ' },
  { slug: 'lincoln-park-pq',      mlsLabel: 'Lincoln Park PQ',         displayName: 'Lincoln Park PQ' },
  { slug: 'lower-mary-hill',      mlsLabel: 'Lower Mary Hill',         displayName: 'Lower Mary Hill' },
  { slug: 'mary-hill',            mlsLabel: 'Mary Hill',               displayName: 'Mary Hill' },
  { slug: 'oxford-heights',       mlsLabel: 'Oxford Heights',          displayName: 'Oxford Heights' },
  { slug: 'riverwood',            mlsLabel: 'Riverwood',               displayName: 'Riverwood' },
  { slug: 'woodland-acres-pq',    mlsLabel: 'Woodland Acres PQ',       displayName: 'Woodland Acres PQ' },
  // ── Port Moody (Tri-Cities) ───────────────────────────────────────────────
  { slug: 'anmore',               mlsLabel: 'Anmore',                  displayName: 'Anmore' },
  { slug: 'barber-street',        mlsLabel: 'Barber Street',           displayName: 'Barber Street' },
  { slug: 'belcarra',             mlsLabel: 'Belcarra',                displayName: 'Belcarra' },
  { slug: 'college-park-pm',      mlsLabel: 'College Park PM',         displayName: 'College Park PM' },
  { slug: 'glenayre',             mlsLabel: 'Glenayre',                displayName: 'Glenayre' },
  { slug: 'heritage-mountain',    mlsLabel: 'Heritage Mountain',       displayName: 'Heritage Mountain' },
  { slug: 'heritage-woods-pm',    mlsLabel: 'Heritage Woods PM',       displayName: 'Heritage Woods PM' },
  { slug: 'mountain-meadows',     mlsLabel: 'Mountain Meadows',        displayName: 'Mountain Meadows' },
  { slug: 'north-shore-pt-moody', mlsLabel: 'North Shore Pt Moody',    displayName: 'North Shore Pt Moody' },
  { slug: 'port-moody-centre',    mlsLabel: 'Port Moody Centre',       displayName: 'Port Moody Centre' },
  // ── Burnaby (Saeed Farhani) ───────────────────────────────────────────────
  { slug: 'metrotown',            mlsLabel: 'Metrotown',               displayName: 'Metrotown' },
  { slug: 'brentwood-park',       mlsLabel: 'Brentwood Park',          displayName: 'Brentwood Park' },
  { slug: 'edmonds-be',           mlsLabel: 'Edmonds BE',              displayName: 'Edmonds' },
  { slug: 'edmonds',              mlsLabel: 'Edmonds BE',              displayName: 'Edmonds' },
  { slug: 'simon-fraser-univ',    mlsLabel: 'Simon Fraser Univer.',    displayName: 'Simon Fraser University' },
  { slug: 'highgate',             mlsLabel: 'Highgate',                displayName: 'Highgate' },
  { slug: 'south-slope',          mlsLabel: 'South Slope',             displayName: 'South Slope' },
  { slug: 'forest-glen-bs',       mlsLabel: 'Forest Glen BS',          displayName: 'Forest Glen' },
  { slug: 'sullivan-heights',     mlsLabel: 'Sullivan Heights',        displayName: 'Sullivan Heights' },
  { slug: 'capitol-hill-bn',      mlsLabel: 'Capitol Hill BN',         displayName: 'Capitol Hill' },
  { slug: 'government-road',      mlsLabel: 'Government Road',         displayName: 'Government Road' },
  { slug: 'sperling-duthie',      mlsLabel: 'Sperling-Duthie',         displayName: 'Sperling-Duthie' },
  { slug: 'burnaby-lake',         mlsLabel: 'Burnaby Lake',            displayName: 'Burnaby Lake' },
  { slug: 'east-burnaby',         mlsLabel: 'East Burnaby',            displayName: 'East Burnaby' },
  { slug: 'parkcrest',            mlsLabel: 'Parkcrest',               displayName: 'Parkcrest' },
  { slug: 'central-bn',           mlsLabel: 'Central BN',              displayName: 'Central Burnaby' },
  { slug: 'willingdon-heights',   mlsLabel: 'Willingdon Heights',      displayName: 'Willingdon Heights' },
  { slug: 'vancouver-heights-bn', mlsLabel: 'Vancouver Heights',       displayName: 'Vancouver Heights' },
  { slug: 'central-park-bs',      mlsLabel: 'Central Park BS',         displayName: 'Central Park' },
  { slug: 'montecito',            mlsLabel: 'Montecito',               displayName: 'Montecito' },
  { slug: 'burnaby-hospital',     mlsLabel: 'Burnaby Hospital',        displayName: 'Burnaby Hospital' },
  { slug: 'the-crest',            mlsLabel: 'The Crest',               displayName: 'The Crest' },
  { slug: 'cariboo',              mlsLabel: 'Cariboo',                 displayName: 'Cariboo' },
  { slug: 'upper-deer-lake',      mlsLabel: 'Upper Deer Lake',         displayName: 'Upper Deer Lake' },
  { slug: 'westridge-bn',         mlsLabel: 'Westridge BN',            displayName: 'Westridge' },
  { slug: 'garden-village',       mlsLabel: 'Garden Village',          displayName: 'Garden Village' },
  { slug: 'buckingham-heights',   mlsLabel: 'Buckingham Heights',      displayName: 'Buckingham Heights' },
  { slug: 'deer-lake',            mlsLabel: 'Deer Lake',               displayName: 'Deer Lake' },
  { slug: 'simon-fraser-hills',   mlsLabel: 'Simon Fraser Hills',      displayName: 'Simon Fraser Hills' },
  { slug: 'deer-lake-place',      mlsLabel: 'Deer Lake Place',         displayName: 'Deer Lake Place' },
]

/**
 * MLS internal label or displayName → URL slug.
 * Checks mlsLabel first, then displayName (for DB territory names that differ from MLS codes).
 * Falls back to raw value for unknown inputs.
 */
export function toSubareaSlug(mlsLabelOrName: string): string {
  return (
    SUBAREA_MAP.find(e => e.mlsLabel === mlsLabelOrName)?.slug ??
    SUBAREA_MAP.find(e => e.displayName === mlsLabelOrName)?.slug ??
    mlsLabelOrName
  )
}

/** URL slug → MLS internal label (for API queries). Falls back to raw value for unknown slugs. */
export function fromSubareaSlug(slug: string): string {
  return SUBAREA_MAP.find(e => e.slug === slug)?.mlsLabel ?? slug
}

/**
 * URL slug or MLS label → human-readable display name.
 * Accepts both forms so callers don't need to pre-convert.
 */
export function subareaDisplayName(slugOrMls: string): string {
  return (
    SUBAREA_MAP.find(e => e.slug === slugOrMls)?.displayName ??
    SUBAREA_MAP.find(e => e.mlsLabel === slugOrMls)?.displayName ??
    slugOrMls
  )
}

/**
 * Returns a safe /homes-for-sale href for any subarea value (MLS label, display name, or slug).
 * - Known subareas  → clean path form: /homes-for-sale/{slug}  (SEO-canonical, no redirect needed)
 * - Unknown values  → query form:      /homes-for-sale?subarea=…  (functional, avoids 404)
 *
 * Path is relative to the agent root; wrap with ap() or prepend /agent/{slug} as needed.
 */
export function toHomesForSaleHref(nameOrMls: string): string {
  const slug = (
    SUBAREA_MAP.find(e => e.mlsLabel === nameOrMls)?.slug ??
    SUBAREA_MAP.find(e => e.displayName === nameOrMls)?.slug ??
    SUBAREA_MAP.find(e => e.slug === nameOrMls)?.slug
  )
  return slug
    ? `/homes-for-sale/${slug}`
    : `/homes-for-sale?subarea=${encodeURIComponent(nameOrMls)}`
}

/**
 * Normalize any subarea value (slug or raw MLS label) to its canonical slug form.
 * Used in URL builders so that legacy bookmarks with MLS codes produce clean outbound links.
 * Unknown values are passed through unchanged for backwards compatibility.
 */
export function normalizeToSubareaSlug(value: string): string {
  // Already a known slug → return as-is
  const bySlug = SUBAREA_MAP.find(e => e.slug === value)
  if (bySlug) return bySlug.slug
  // MLS internal label → convert to slug
  const byMls = SUBAREA_MAP.find(e => e.mlsLabel === value)
  if (byMls) return byMls.slug
  // Unknown → return raw value (backwards compat)
  return value
}
