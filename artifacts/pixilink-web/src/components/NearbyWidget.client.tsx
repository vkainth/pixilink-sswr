'use client'

import { useState } from 'react'

interface Place {
  name: string
  detail: string
  icon: string
}

interface SubareaData {
  schools: Place[]
  transit: Place[]
  parks: Place[]
  groceries: Place[]
  walkScore: number
  transitScore: number
  bikeScore: number
}

const NEARBY_DATA: Record<string, SubareaData> = {
  'White Rock': {
    schools: [
      { name: 'White Rock Elementary', detail: '0.6 km', icon: '🏫' },
      { name: 'Semiahmoo Secondary', detail: '1.2 km', icon: '🏫' },
      { name: 'Peace Arch Elementary', detail: '1.7 km', icon: '🏫' },
      { name: 'Bayridge Elementary', detail: '2.1 km', icon: '🏫' },
    ],
    transit: [
      { name: 'White Rock Centre Exchange', detail: 'Bus loop · 0.4 km', icon: '🚌' },
      { name: 'Marine Dr & Johnston Rd', detail: 'Route 351 · 0.6 km', icon: '🚌' },
      { name: 'Peace Arch Hospital Stop', detail: 'Route 351 · 1.1 km', icon: '🚌' },
      { name: 'Semiahmoo Mall Loop', detail: 'Routes 314/321 · 1.5 km', icon: '🚌' },
    ],
    parks: [
      { name: 'White Rock Beach & Pier', detail: 'Waterfront promenade · 0.8 km', icon: '🏖' },
      { name: 'Centennial Park', detail: 'Community sports fields · 0.9 km', icon: '🌳' },
      { name: 'East Beach Boardwalk', detail: 'Scenic waterfront walk · 1.1 km', icon: '🚶' },
      { name: 'Rotary Trail', detail: 'Paved multi-use trail · 1.6 km', icon: '🚶' },
    ],
    groceries: [
      { name: 'Semiahmoo Mall', detail: 'Major shopping centre · 1.3 km', icon: '🛒' },
      { name: 'Save-On-Foods (White Rock)', detail: 'Full-service grocery · 1.4 km', icon: '🛒' },
      { name: 'Five Corners', detail: 'Restaurants & cafés · 0.7 km', icon: '🍽' },
      { name: 'Pier 73 Pub & Restaurant', detail: 'Waterfront dining · 1.0 km', icon: '🍽' },
    ],
    walkScore: 72, transitScore: 48, bikeScore: 55,
  },
  'South Surrey': {
    schools: [
      { name: 'Elgin Park Secondary', detail: '1.1 km', icon: '🏫' },
      { name: 'Chantrell Creek Elementary', detail: '1.3 km', icon: '🏫' },
      { name: 'Crescent Park Elementary', detail: '1.9 km', icon: '🏫' },
      { name: 'Southridge School', detail: 'Independent K–12 · 2.3 km', icon: '🏫' },
    ],
    transit: [
      { name: 'King George Blvd & 32 Ave', detail: 'Route 321 · 0.5 km', icon: '🚌' },
      { name: '24 Ave & 152 St', detail: 'Route 345 · 0.8 km', icon: '🚌' },
      { name: 'Morgan Crossing Bus Stop', detail: 'Routes 321/345 · 1.2 km', icon: '🚌' },
      { name: 'South Surrey Park & Ride', detail: 'Express to Surrey Central · 2.1 km', icon: '🚌' },
    ],
    parks: [
      { name: 'Crescent Beach', detail: 'Sandy beach & trail · 3.2 km', icon: '🏖' },
      { name: 'Elgin Heritage Park', detail: 'Riverside trails & picnic · 2.8 km', icon: '🌳' },
      { name: 'Sunnyside Acres Urban Forest', detail: 'Old-growth forest trails · 1.5 km', icon: '🌲' },
      { name: 'Tynehead Regional Park', detail: 'Wetland trails · 4.0 km', icon: '🌳' },
    ],
    groceries: [
      { name: 'Morgan Crossing', detail: 'Retail & dining hub · 1.2 km', icon: '🛒' },
      { name: 'Thrifty Foods (24 Ave)', detail: 'Full-service grocery · 1.6 km', icon: '🛒' },
      { name: 'Grandview Corners', detail: 'Restaurants & shops · 2.0 km', icon: '🍽' },
      { name: "Earl's South Surrey", detail: 'Casual fine dining · 1.9 km', icon: '🍽' },
    ],
    walkScore: 58, transitScore: 42, bikeScore: 47,
  },
  'Semiahmoo': {
    schools: [
      { name: 'Semiahmoo Secondary', detail: '0.5 km', icon: '🏫' },
      { name: 'Ray Shepherd Elementary', detail: '0.9 km', icon: '🏫' },
      { name: 'White Rock Elementary', detail: '1.4 km', icon: '🏫' },
      { name: 'Pacific Heights Elementary', detail: '2.2 km', icon: '🏫' },
    ],
    transit: [
      { name: 'Semiahmoo Mall Exchange', detail: 'Routes 314/321 · 0.3 km', icon: '🚌' },
      { name: 'King George Blvd & 16 Ave', detail: 'Route 321 · 0.7 km', icon: '🚌' },
      { name: 'Johnston Rd & North Bluff Rd', detail: 'Route 351 · 0.9 km', icon: '🚌' },
      { name: 'Nicomekl Express Stop', detail: 'Route 321 · 1.4 km', icon: '🚌' },
    ],
    parks: [
      { name: 'Semiahmoo Park', detail: 'Beachside trails · 0.6 km', icon: '🌳' },
      { name: 'Bakerview Park', detail: 'Sports fields & playground · 1.1 km', icon: '🌳' },
      { name: 'White Rock Beach', detail: 'Waterfront promenade · 1.5 km', icon: '🏖' },
      { name: 'Peace Arch Provincial Park', detail: 'Historic gardens · 2.4 km', icon: '🌿' },
    ],
    groceries: [
      { name: 'Semiahmoo Mall', detail: 'Major shopping · 0.3 km', icon: '🛒' },
      { name: 'Save-On-Foods', detail: 'Inside Semiahmoo Mall · 0.4 km', icon: '🛒' },
      { name: 'Five Corners', detail: 'Local cafés & restaurants · 1.2 km', icon: '🍽' },
      { name: 'Pier 73', detail: 'Seafood dining · 1.8 km', icon: '🍽' },
    ],
    walkScore: 76, transitScore: 55, bikeScore: 60,
  },
  'Cloverdale': {
    schools: [
      { name: 'Cloverdale Traditional School', detail: '0.7 km', icon: '🏫' },
      { name: 'Lord Tweedsmuir Secondary', detail: '1.0 km', icon: '🏫' },
      { name: 'Martha Currie Elementary', detail: '1.4 km', icon: '🏫' },
      { name: 'Clayton Heights Secondary', detail: '2.2 km', icon: '🏫' },
    ],
    transit: [
      { name: 'Cloverdale Town Centre', detail: 'Routes 394/395 · 0.4 km', icon: '🚌' },
      { name: '64 Ave & 176 St', detail: 'Route 394 · 0.6 km', icon: '🚌' },
      { name: 'Langley Centre Exchange', detail: 'Express routes · 3.5 km', icon: '🚌' },
      { name: 'Surrey Central Station', detail: 'SkyTrain · 8 km (P&R available)', icon: '🚇' },
    ],
    parks: [
      { name: 'Cloverdale Athletic Park', detail: 'Multi-sport complex · 0.5 km', icon: '⚽' },
      { name: 'Sunrise Ridge Park', detail: 'Trails & playground · 0.9 km', icon: '🌳' },
      { name: 'Hjorth Road Park', detail: 'Forest walking trails · 1.8 km', icon: '🌲' },
      { name: 'Surrey Sport & Leisure Centre', detail: 'Aquatic & fitness · 2.1 km', icon: '🏊' },
    ],
    groceries: [
      { name: 'Cloverdale Mall', detail: 'Retail & grocery · 0.5 km', icon: '🛒' },
      { name: 'Save-On-Foods (Cloverdale)', detail: 'Full-service grocery · 0.7 km', icon: '🛒' },
      { name: 'Historic Cloverdale Strip', detail: 'Local restaurants · 0.4 km', icon: '🍽' },
      { name: 'Williams Landing', detail: 'Family dining · 0.9 km', icon: '🍽' },
    ],
    walkScore: 64, transitScore: 38, bikeScore: 44,
  },
  'Morgan Creek': {
    schools: [
      { name: 'Morgan Elementary', detail: '0.4 km', icon: '🏫' },
      { name: 'Woodward Hill Elementary', detail: '1.6 km', icon: '🏫' },
      { name: 'Earl Marriott Secondary', detail: '1.8 km', icon: '🏫' },
      { name: 'Southridge School', detail: 'Independent K–12 · 2.5 km', icon: '🏫' },
    ],
    transit: [
      { name: '24 Ave & 160 St', detail: 'Route 345 · 0.8 km', icon: '🚌' },
      { name: 'Morgan Crossing Loop', detail: 'Route 321 · 1.0 km', icon: '🚌' },
      { name: 'Grandview Heights Bus Stop', detail: 'Route 341 · 1.5 km', icon: '🚌' },
      { name: 'King George Blvd & 32 Ave', detail: 'Route 321 · 2.0 km', icon: '🚌' },
    ],
    parks: [
      { name: 'Morgan Creek Golf Course', detail: 'Championship 18-hole · 0.4 km', icon: '⛳' },
      { name: 'Sunnyside Acres Urban Forest', detail: 'Old-growth trails · 1.2 km', icon: '🌲' },
      { name: 'Crescent Park', detail: 'Family park & fields · 1.8 km', icon: '🌳' },
      { name: 'Elgin Heritage Park', detail: 'Riverside trails · 3.0 km', icon: '🌿' },
    ],
    groceries: [
      { name: 'Morgan Crossing', detail: 'Open-air retail centre · 1.0 km', icon: '🛒' },
      { name: 'Thrifty Foods', detail: 'Morgan Crossing · 1.1 km', icon: '🛒' },
      { name: 'Cactus Club Café', detail: 'Casual fine dining · 1.2 km', icon: '🍽' },
      { name: 'Browns Socialhouse', detail: 'Neighbourhood pub & dining · 1.4 km', icon: '🍽' },
    ],
    walkScore: 42, transitScore: 30, bikeScore: 38,
  },
  'Grandview': {
    schools: [
      { name: 'Grandview Heights Secondary', detail: '0.9 km', icon: '🏫' },
      { name: 'Grandview Heights Elementary', detail: '1.2 km', icon: '🏫' },
      { name: 'Katzie Elementary', detail: '2.4 km', icon: '🏫' },
      { name: 'Pacific Heights Elementary', detail: '2.8 km', icon: '🏫' },
    ],
    transit: [
      { name: '168 St & 28 Ave', detail: 'Route 341 · 0.5 km', icon: '🚌' },
      { name: 'Grandview Corners Loop', detail: 'Routes 321/341 · 0.9 km', icon: '🚌' },
      { name: '32 Ave & 152 St', detail: 'Route 345 · 1.8 km', icon: '🚌' },
      { name: 'South Surrey P&R', detail: 'Express service · 2.5 km', icon: '🚌' },
    ],
    parks: [
      { name: 'Grandview Corners Park', detail: 'Community green space · 0.7 km', icon: '🌳' },
      { name: 'Sunnyside Acres Urban Forest', detail: 'Old-growth forest · 2.0 km', icon: '🌲' },
      { name: 'Elgin Heritage Park', detail: 'Riverside trails · 3.5 km', icon: '🌿' },
      { name: 'Tynehead Regional Park', detail: 'Wetland trails · 4.5 km', icon: '🌳' },
    ],
    groceries: [
      { name: 'Grandview Corners', detail: 'Retail & dining hub · 0.9 km', icon: '🛒' },
      { name: 'Fresh St. Market', detail: 'Premium grocery · 0.9 km', icon: '🛒' },
      { name: 'The Tap & Barrel', detail: 'Casual dining & bar · 1.0 km', icon: '🍽' },
      { name: 'Booster Juice & cafés', detail: 'Quick eats & coffee · 0.8 km', icon: '🍽' },
    ],
    walkScore: 52, transitScore: 36, bikeScore: 42,
  },
  'Pacific Douglas': {
    schools: [
      { name: 'Pacific Heights Elementary', detail: '0.8 km', icon: '🏫' },
      { name: 'Woodward Hill Elementary', detail: '2.5 km', icon: '🏫' },
      { name: 'Earl Marriott Secondary', detail: '3.1 km', icon: '🏫' },
      { name: 'Elgin Park Secondary', detail: '3.8 km', icon: '🏫' },
    ],
    transit: [
      { name: '8 Ave & 160 St', detail: 'Route 345 · 1.1 km', icon: '🚌' },
      { name: 'South Surrey Park & Ride', detail: 'Express to Surrey Central · 1.8 km', icon: '🚌' },
      { name: 'King George Blvd & 8 Ave', detail: 'Route 321 · 2.0 km', icon: '🚌' },
      { name: 'Semiahmoo Mall Exchange', detail: 'Route 314 connection · 4.0 km', icon: '🚌' },
    ],
    parks: [
      { name: 'Peace Arch Provincial Park', detail: 'Historic gardens & trails · 0.9 km', icon: '🌿' },
      { name: 'Hazelmere Valley Trails', detail: 'Rural walking paths · 1.5 km', icon: '🌲' },
      { name: 'Crescent Beach', detail: 'Sandy beach & boardwalk · 5.0 km', icon: '🏖' },
      { name: 'Elgin Heritage Park', detail: 'Riverside trails · 5.5 km', icon: '🌳' },
    ],
    groceries: [
      { name: 'Semiahmoo Mall', detail: 'Major shopping · 4.0 km', icon: '🛒' },
      { name: 'Save-On-Foods', detail: 'Semiahmoo Mall · 4.1 km', icon: '🛒' },
      { name: 'Peace Arch Crossing area', detail: 'Local dining options · 1.2 km', icon: '🍽' },
      { name: 'Morgan Crossing', detail: 'Retail & restaurant hub · 4.5 km', icon: '🍽' },
    ],
    walkScore: 28, transitScore: 22, bikeScore: 32,
  },
}

const DEFAULT_NEARBY: SubareaData = {
  schools: [
    { name: 'Local Elementary School', detail: 'Catchment school · < 1.5 km', icon: '🏫' },
    { name: 'Local Middle School', detail: '< 2 km', icon: '🏫' },
    { name: 'Local Secondary School', detail: '< 3 km', icon: '🏫' },
    { name: 'Nearby Private School', detail: 'Independent option · < 5 km', icon: '🏫' },
  ],
  transit: [
    { name: 'Nearest Bus Stop', detail: 'Local route · < 1 km', icon: '🚌' },
    { name: 'Transit Exchange', detail: 'Connecting routes · < 3 km', icon: '🚌' },
    { name: 'Park & Ride', detail: 'Express service · < 5 km', icon: '🚌' },
    { name: 'SkyTrain Station', detail: 'Rapid transit · < 10 km', icon: '🚇' },
  ],
  parks: [
    { name: 'Local Community Park', detail: 'Sports fields & playground · < 1 km', icon: '🌳' },
    { name: 'Regional Trail Network', detail: 'Walking & cycling paths · < 2 km', icon: '🚶' },
    { name: 'Recreation Centre', detail: 'Aquatic & fitness · < 3 km', icon: '🏊' },
    { name: 'Natural Area', detail: 'Green space & nature trails · < 4 km', icon: '🌲' },
  ],
  groceries: [
    { name: 'Nearest Grocery Store', detail: 'Full-service grocery · < 2 km', icon: '🛒' },
    { name: 'Local Shopping Centre', detail: 'Retail & services · < 3 km', icon: '🛒' },
    { name: 'Local Restaurants', detail: 'Casual dining · < 2 km', icon: '🍽' },
    { name: 'Coffee Shops & Cafés', detail: '< 1.5 km', icon: '🍽' },
  ],
  walkScore: 50, transitScore: 40, bikeScore: 40,
}

const SUBAREA_ALIASES: Record<string, string> = {
  'south surrey white rock': 'South Surrey',
  'south surrey / white rock': 'South Surrey',
  'grandview heights': 'Grandview',
  'grandview heights south surrey': 'Grandview',
  'cloverdale surrey': 'Cloverdale',
  'semiahmoo peninsula': 'Semiahmoo',
  'morgan creek south surrey': 'Morgan Creek',
  'pacific douglas border': 'Pacific Douglas',
  'pacific douglas south surrey': 'Pacific Douglas',
}

function getNearbyData(subarea: string | null, city: string | null): SubareaData {
  const normalize = (s: string) => s.toLowerCase().trim()

  if (subarea) {
    if (NEARBY_DATA[subarea]) return NEARBY_DATA[subarea]
    const subareaAlias = SUBAREA_ALIASES[normalize(subarea)]
    if (subareaAlias && NEARBY_DATA[subareaAlias]) return NEARBY_DATA[subareaAlias]
    const exactCi = Object.keys(NEARBY_DATA).find(k => normalize(k) === normalize(subarea))
    if (exactCi) return NEARBY_DATA[exactCi]
    const containsKey = Object.keys(NEARBY_DATA).find(k =>
      normalize(subarea).includes(normalize(k)) || normalize(k).includes(normalize(subarea))
    )
    if (containsKey) return NEARBY_DATA[containsKey]
  }

  if (city) {
    if (NEARBY_DATA[city]) return NEARBY_DATA[city]
    const cityAlias = SUBAREA_ALIASES[normalize(city)]
    if (cityAlias && NEARBY_DATA[cityAlias]) return NEARBY_DATA[cityAlias]
    const exactCi = Object.keys(NEARBY_DATA).find(k => normalize(k) === normalize(city))
    if (exactCi) return NEARBY_DATA[exactCi]
    const containsKey = Object.keys(NEARBY_DATA).find(k =>
      normalize(city).includes(normalize(k)) || normalize(k).includes(normalize(city))
    )
    if (containsKey) return NEARBY_DATA[containsKey]
  }

  return DEFAULT_NEARBY
}

type Tab = 'schools' | 'transit' | 'parks' | 'groceries'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'schools', label: 'Schools', icon: '🏫' },
  { id: 'transit', label: 'Transit', icon: '🚌' },
  { id: 'parks', label: 'Parks & Recreation', icon: '🌳' },
  { id: 'groceries', label: 'Groceries & Dining', icon: '🍽' },
]

const SCORE_COLORS: Record<string, { ring: string; label: string }> = {
  walk:    { ring: '#16a34a', label: 'Walk Score' },
  transit: { ring: '#2563eb', label: 'Transit Score' },
  bike:    { ring: '#d97706', label: 'Bike Score' },
}

function ScoreCircle({ score, colorKey }: { score: number; colorKey: string }) {
  const { ring, label } = SCORE_COLORS[colorKey]
  const grade = score >= 90 ? "Walker's Paradise" : score >= 70 ? 'Very Walkable' : score >= 50 ? 'Somewhat Walkable' : 'Car-Dependent'
  const transitGrade = score >= 75 ? 'Excellent Transit' : score >= 50 ? 'Good Transit' : score >= 25 ? 'Some Transit' : 'Minimal Transit'
  const bikeGrade = score >= 70 ? 'Very Bikeable' : score >= 50 ? 'Bikeable' : 'Some Biking'
  const desc = colorKey === 'transit' ? transitGrade : colorKey === 'bike' ? bikeGrade : grade

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: `5px solid ${ring}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        boxShadow: `0 0 0 2px rgba(0,0,0,0.06)`,
      }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: ring, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: ring, fontWeight: 700, letterSpacing: '0.04em' }}>/100</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  )
}

interface Props {
  subarea: string | null
  city: string | null
  accent?: string
}

export default function NearbyWidget({ subarea, city, accent = 'var(--accent)' }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('schools')
  const data = getNearbyData(subarea, city)

  const places: Place[] = activeTab === 'schools' ? data.schools
    : activeTab === 'transit' ? data.transit
    : activeTab === 'parks' ? data.parks
    : data.groceries

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      {/* Score bar */}
      <div style={{ background: 'var(--off-white)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ScoreCircle score={data.walkScore} colorKey="walk" />
          <ScoreCircle score={data.transitScore} colorKey="transit" />
          <ScoreCircle score={data.bikeScore} colorKey="bike" />
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
          Scores are estimates based on local amenities and transit access. Actual walkability may vary.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1 1 auto', padding: '11px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                color: isActive ? accent : 'var(--text-muted)',
                borderBottom: isActive ? `2px solid ${accent}` : '2px solid transparent',
                marginBottom: -1, whiteSpace: 'nowrap', transition: 'color 0.15s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          )
        })}
      </div>

      {/* Place list */}
      <div style={{ padding: '16px 24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {places.map(place => (
            <div key={place.name} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 14px', background: 'var(--off-white)', borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, marginTop: 1 }}>{place.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{place.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{place.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
