'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

const ANNUAL_RATE = 0.0275
const MONTHLY_RATE = ANNUAL_RATE / 12
const AMORT_MONTHS = 300

function calcMonthly(price: number): number {
  const principal = price * 0.8
  if (principal <= 0) return 0
  return Math.round(principal * MONTHLY_RATE * Math.pow(1 + MONTHLY_RATE, AMORT_MONTHS) / (Math.pow(1 + MONTHLY_RATE, AMORT_MONTHS) - 1))
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

export interface HeatmapPoint {
  lat: number
  lng: number
  type: string
  beds: number | null
  year: number | null
  price: number
  subarea: string
  city: string
}

type Days = 7 | 14 | 30
type PropType = 'all' | 'House' | 'Apartment' | 'Townhouse'
type BedsFilter = 'any' | '1' | '2' | '3' | '4+'
type YearFilter = 'any' | 'pre1990' | '1990to2010' | '2010plus'

const PRICE_TIERS = [
  { label: 'Under $600K',    color: '#4a90d9' },
  { label: '$600K – $999K',  color: '#27ae60' },
  { label: '$1M – $1.49M',   color: '#f1c40f' },
  { label: '$1.5M – $2.49M', color: '#e67e22' },
  { label: '$2.5M+',         color: '#c0392b' },
]

const CIRCLE_COLOR_EXPR: any[] = [
  'step', ['get', 'price'],
  '#4a90d9',
  600_000,   '#27ae60',
  1_000_000, '#f1c40f',
  1_500_000, '#e67e22',
  2_500_000, '#c0392b',
]

function matchType(point: HeatmapPoint, f: PropType): boolean {
  if (f === 'all') return true
  const t = point.type.toLowerCase()
  if (f === 'House') return t.includes('house') || t.includes('detach') || t.includes('duplex') || t.includes('residential')
  if (f === 'Apartment') return t.includes('apartment') || t.includes('condo')
  if (f === 'Townhouse') return t.includes('town') || t.includes('row')
  return false
}

function matchBeds(point: HeatmapPoint, f: BedsFilter): boolean {
  if (f === 'any') return true
  const b = point.beds ?? 0
  if (f === '1') return b === 1
  if (f === '2') return b === 2
  if (f === '3') return b === 3
  if (f === '4+') return b >= 4
  return true
}

function matchYear(point: HeatmapPoint, f: YearFilter): boolean {
  if (f === 'any') return true
  const y = point.year ?? 0
  if (f === 'pre1990') return y > 0 && y < 1990
  if (f === '1990to2010') return y >= 1990 && y <= 2010
  if (f === '2010plus') return y > 2010
  return true
}

function applyFilters(
  raw: HeatmapPoint[],
  type: PropType, beds: BedsFilter, year: YearFilter,
  minPrice: number, maxPrice: number,
): HeatmapPoint[] {
  return raw.filter(p =>
    matchType(p, type) &&
    matchBeds(p, beds) &&
    matchYear(p, year) &&
    (minPrice === 0 || p.price >= minPrice) &&
    (maxPrice === 0 || p.price <= maxPrice)
  )
}

function toGeoJSON(points: HeatmapPoint[]): any {
  return {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        price:   p.price,
        type:    p.type,
        beds:    p.beds,
        subarea: p.subarea,
        city:    p.city,
      },
    })),
  }
}

interface Props {
  fullscreen?: boolean
}

export default function ResidencityHeatmap({ fullscreen = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const mapRef   = useRef<HTMLDivElement>(null)
  const mapInst  = useRef<any>(null)
  const rawFeatures = useRef<HeatmapPoint[]>([])
  const mglRef   = useRef<any>(null)
  const popupRef = useRef<any>(null)

  const [days, setDays] = useState<Days>(() => {
    const d = Number(searchParams.get('days'))
    return ([7, 14, 30] as Days[]).includes(d as Days) ? (d as Days) : 14
  })
  const [type,     setType]     = useState<PropType>((searchParams.get('type') as PropType) ?? 'all')
  const [beds,     setBeds]     = useState<BedsFilter>((searchParams.get('beds') as BedsFilter) ?? 'any')
  const [year,     setYear]     = useState<YearFilter>((searchParams.get('year') as YearFilter) ?? 'any')
  const [minPrice, setMinPrice] = useState<number>(Number(searchParams.get('minp') ?? 0))
  const [maxPrice, setMaxPrice] = useState<number>(Number(searchParams.get('maxp') ?? 0))

  const [mapReady,      setMapReady]      = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [totalPoints,   setTotalPoints]   = useState(0)
  const [showingPoints, setShowingPoints] = useState(0)
  const [showLegend,    setShowLegend]    = useState(true)
  const [showMore,      setShowMore]      = useState(false)

  const MAX_PRICE = 5_000_000

  const syncUrlParams = useCallback((
    d: Days, t: PropType, b: BedsFilter, y: YearFilter, mn: number, mx: number
  ) => {
    const params = new URLSearchParams()
    if (d !== 14) params.set('days', String(d))
    if (t !== 'all') params.set('type', t)
    if (b !== 'any') params.set('beds', b)
    if (y !== 'any') params.set('year', y)
    if (mn > 0) params.set('minp', String(mn))
    if (mx > 0) params.set('maxp', String(mx))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false })
  }, [router])

  const updateMap = useCallback((filtered: HeatmapPoint[]) => {
    const map = mapInst.current
    if (!map || !map.getSource('solds')) return
    map.getSource('solds').setData(toGeoJSON(filtered))
    setShowingPoints(filtered.length)
  }, [])

  const applyAndUpdate = useCallback((
    t: PropType, b: BedsFilter, y: YearFilter, mn: number, mx: number
  ) => {
    const filtered = applyFilters(rawFeatures.current, t, b, y, mn, mx)
    updateMap(filtered)
  }, [updateMap])

  const fetchHeatmap = useCallback((d: Days) => {
    setLoading(true)
    fetch(`/api/residencity/heatmap?days=${d}`)
      .then(r => r.json())
      .then((data: HeatmapPoint[]) => {
        rawFeatures.current = Array.isArray(data) ? data : []
        setTotalPoints(rawFeatures.current.length)
        applyAndUpdate(type, beds, year, minPrice, maxPrice)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [type, beds, year, minPrice, maxPrice, applyAndUpdate])

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css'
    document.head.appendChild(link)

    let map: any = null
    import('mapbox-gl').then(mod => {
      const mgl: any = mod.default
      mglRef.current = mgl
      mgl.accessToken = MAPBOX_TOKEN

      const instance = new mgl.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-122.82, 49.18],
        zoom: 8.8,
        attributionControl: false,
      })

      map = instance
      instance.on('load', () => {
        mapInst.current = instance

        instance.addSource('solds', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })

        instance.addLayer({
          id: 'solds-heat',
          type: 'circle',
          source: 'solds',
          paint: {
            'circle-color':        CIRCLE_COLOR_EXPR,
            'circle-radius':       ['interpolate', ['linear'], ['zoom'], 8, 2.5, 12, 5, 15, 9],
            'circle-opacity':      ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 0.92],
            'circle-stroke-width': 0.6,
            'circle-stroke-color': 'rgba(255,255,255,0.2)',
          },
        })

        // Click → popup card
        instance.on('click', 'solds-heat', (e: any) => {
          if (!e.features?.length) return
          const p = e.features[0].properties
          const price: number  = p.price ?? 0
          const typeLabel      = p.type ?? ''
          const bedsNum        = p.beds != null ? Number(p.beds) : null
          const location       = p.subarea || p.city || ''

          const priceStr = price >= 1_000_000
            ? `$${(price / 1_000_000).toFixed(2)}M`
            : price >= 1_000
              ? `$${Math.round(price / 1_000).toLocaleString()}K`
              : `$${price}`

          let dotColor = '#4a90d9'
          if      (price >= 2_500_000) dotColor = '#c0392b'
          else if (price >= 1_500_000) dotColor = '#e67e22'
          else if (price >= 1_000_000) dotColor = '#f1c40f'
          else if (price >= 600_000)   dotColor = '#27ae60'

          const bedsLine = bedsNum ? `· ${bedsNum} bed${bedsNum === 1 ? '' : 's'}` : ''

          // Build popup DOM safely (no innerHTML / setHTML to avoid XSS)
          const wrap = document.createElement('div')
          wrap.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:12px 14px;background:rgba(12,18,28,0.97);border-radius:10px;color:#fff;'

          const priceDiv = document.createElement('div')
          priceDiv.style.cssText = `font-size:22px;font-weight:700;color:${dotColor};letter-spacing:-0.5px;margin-bottom:2px;`
          priceDiv.textContent = priceStr
          wrap.appendChild(priceDiv)

          const typeDiv = document.createElement('div')
          typeDiv.style.cssText = 'font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:4px;'
          typeDiv.textContent = bedsLine ? `${typeLabel} ${bedsLine}` : typeLabel
          wrap.appendChild(typeDiv)

          if (location) {
            const locDiv = document.createElement('div')
            locDiv.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;margin-top:4px;'
            locDiv.textContent = `📍 ${location}`
            wrap.appendChild(locDiv)
          }

          if (popupRef.current) popupRef.current.remove()
          popupRef.current = new mgl.Popup({ closeButton: true, maxWidth: '240px', className: 'rc-popup' })
            .setLngLat(e.lngLat)
            .setDOMContent(wrap)
            .addTo(instance)
        })

        instance.on('mouseenter', 'solds-heat', () => { instance.getCanvas().style.cursor = 'pointer' })
        instance.on('mouseleave', 'solds-heat', () => { instance.getCanvas().style.cursor = '' })

        setMapReady(true)
        fetchHeatmap(days)
      })
    })

    return () => {
      link.remove()
      if (map) map.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapReady) return
    fetchHeatmap(days)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, mapReady])

  useEffect(() => {
    if (!mapReady) return
    applyAndUpdate(type, beds, year, minPrice, maxPrice)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, beds, year, minPrice, maxPrice, mapReady])

  const handleDays     = (d: Days)       => { setDays(d);      syncUrlParams(d, type, beds, year, minPrice, maxPrice) }
  const handleType     = (t: PropType)   => { setType(t);      syncUrlParams(days, t, beds, year, minPrice, maxPrice) }
  const handleBeds     = (b: BedsFilter) => { setBeds(b);      syncUrlParams(days, type, b, year, minPrice, maxPrice) }
  const handleYear     = (y: YearFilter) => { setYear(y);      syncUrlParams(days, type, beds, y, minPrice, maxPrice) }
  const handleMinPrice = (mn: number)    => { setMinPrice(mn); syncUrlParams(days, type, beds, year, mn, maxPrice) }
  const handleMaxPrice = (mx: number)    => { setMaxPrice(mx); syncUrlParams(days, type, beds, year, minPrice, mx) }

  const pill = (label: string, active: boolean, onClick: () => void, small = false) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        fontSize: small ? 11 : 12, fontWeight: 600,
        padding: small ? '5px 10px' : '6px 14px', borderRadius: 20,
        cursor: 'pointer',
        border: `1.5px solid ${active ? '#c9a84c' : 'rgba(255,255,255,0.22)'}`,
        background: active ? '#c9a84c' : 'rgba(255,255,255,0.06)',
        color: active ? '#14213d' : 'rgba(255,255,255,0.85)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}>
      {label}
    </button>
  )

  const glass: React.CSSProperties = {
    background: 'rgba(12,18,28,0.84)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 10,
    padding: '7px 10px',
  }

  const mapH = fullscreen ? '100vh' : 580

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Map ────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', height: mapH,
        borderRadius: fullscreen ? 0 : 14, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(12,18,28,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)',
                borderTop: '3px solid #c9a84c', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Loading sold data…</div>
            </div>
          </div>
        )}

        {/* TOP-LEFT: Day range */}
        <div style={{ position: 'absolute', top: 12, left: 12, ...glass, display: 'flex', gap: 4 }}>
          {([7, 14, 30] as Days[]).map(d => pill(`${d}d`, days === d, () => handleDays(d), true))}
        </div>

        {/* TOP-CENTRE: Property type */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          ...glass, display: 'flex', gap: 5,
        }}>
          {([['all','All'], ['House','Houses'], ['Apartment','Condos'], ['Townhouse','Townhouses']] as [PropType, string][]).map(([v, l]) =>
            pill(l, type === v, () => handleType(v))
          )}
        </div>

        {/* TOP-RIGHT: Fullscreen */}
        {!fullscreen && (
          <a href="/residencity/heatmap" target="_blank" rel="noopener"
            style={{
              position: 'absolute', top: 12, right: 12,
              fontSize: 12, fontWeight: 600, color: '#fff',
              background: 'rgba(12,18,28,0.85)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
              padding: '8px 14px', textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            Full Screen ↗
          </a>
        )}

        {/* BOTTOM-LEFT: Count badge */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          background: 'rgba(12,18,28,0.85)', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
          padding: '6px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500,
        }}>
          {loading ? '…' : `Showing ${showingPoints.toLocaleString()} of ${totalPoints.toLocaleString()} solds`}
        </div>

        {/* BOTTOM-RIGHT: Price legend */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, ...glass, minWidth: 155 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showLegend ? 8 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sold Price</span>
            <button
              onClick={() => setShowLegend(v => !v)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, padding: '0 0 0 8px', lineHeight: '1' }}>
              {showLegend ? '▴' : '▾'}
            </button>
          </div>
          {showLegend && PRICE_TIERS.map(tier => (
            <div key={tier.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>{tier.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── More filters toggle ─────────────────────────────────────────── */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => setShowMore(v => !v)}
          style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
            background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20, padding: '6px 20px', cursor: 'pointer',
          }}>
          {showMore ? '▴ Less filters' : '▾ More filters (beds · year · price)'}
        </button>
      </div>

      {/* ── Expanded filters ────────────────────────────────────────────── */}
      {showMore && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          {/* Beds */}
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Beds</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['any','1','2','3','4+'] as BedsFilter[]).map(v =>
                pill(v === 'any' ? 'Any' : `${v} bd`, beds === v, () => handleBeds(v), true)
              )}
            </div>
          </div>

          {/* Year built */}
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Year Built</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['any','Any'], ['pre1990','Pre-1990'], ['1990to2010','1990–2010'], ['2010plus','2010+']] as [YearFilter, string][]).map(([v, l]) =>
                pill(l, year === v, () => handleYear(v), true)
              )}
            </div>
          </div>

          {/* Price slider */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
              Price — {minPrice > 0 || maxPrice > 0
                ? `${minPrice > 0 ? fmt(minPrice) : '$0'} – ${maxPrice > 0 && maxPrice < MAX_PRICE ? fmt(maxPrice) : '$5M+'}`
                : 'Any'}
            </div>
            <PriceSlider
              min={0} max={MAX_PRICE}
              minVal={minPrice} maxVal={maxPrice === 0 ? MAX_PRICE : maxPrice}
              onMinChange={handleMinPrice}
              onMaxChange={v => handleMaxPrice(v >= MAX_PRICE ? 0 : v)}
            />
          </div>
        </div>
      )}

      {/* Mortgage hint */}
      {maxPrice > 0 && maxPrice < MAX_PRICE && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
          Budget {fmt(maxPrice)} → est. {fmt(calcMonthly(maxPrice))}/mo (20% down, 25yr, 2.75%)
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .rc-popup .mapboxgl-popup-content {
          background: transparent; padding: 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.65); border-radius: 10px;
        }
        .rc-popup .mapboxgl-popup-close-button {
          color: rgba(255,255,255,0.45); font-size: 16px; right: 6px; top: 4px;
          z-index: 1; background: none;
        }
        .rc-popup .mapboxgl-popup-tip { border-top-color: rgba(12,18,28,0.97); }
      `}</style>
    </div>
  )
}

function PriceSlider({
  min, max, minVal, maxVal, onMinChange, onMaxChange,
}: {
  min: number; max: number; minVal: number; maxVal: number
  onMinChange: (v: number) => void; onMaxChange: (v: number) => void
}) {
  const STEPS = [0, 250000, 500000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000]
  const toStep = (v: number) => {
    let closest = 0; let diff = Infinity
    STEPS.forEach((s, i) => { const d = Math.abs(s - v); if (d < diff) { diff = d; closest = i } })
    return closest
  }
  const fromStep = (i: number) => STEPS[Math.min(i, STEPS.length - 1)]
  const minStep = toStep(minVal); const maxStep = toStep(maxVal); const n = STEPS.length - 1
  const leftPct = (minStep / n) * 100; const rightPct = (maxStep / n) * 100

  return (
    <div style={{ position: 'relative', height: 24 }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, transform: 'translateY(-50%)' }}>
        <div style={{ position: 'absolute', height: '100%', borderRadius: 2, left: `${leftPct}%`, width: `${rightPct - leftPct}%`, background: '#c9a84c' }} />
      </div>
      <input type="range" min={0} max={n} value={minStep}
        onChange={e => { const s = Number(e.target.value); if (s < maxStep) onMinChange(fromStep(s)) }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 24 }} />
      <input type="range" min={0} max={n} value={maxStep}
        onChange={e => { const s = Number(e.target.value); if (s > minStep) onMaxChange(fromStep(s)) }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 24 }} />
    </div>
  )
}
