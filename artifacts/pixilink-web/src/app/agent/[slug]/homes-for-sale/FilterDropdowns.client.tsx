'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useEffect } from 'react'
import { toSubareaSlug, subareaDisplayName, normalizeToSubareaSlug } from './subareaUtils'
import { useListingsProgress } from './ListingsProgressContext.client'

const PRICE_OPTIONS = [
  { label: 'Any Price', min: '', max: '' },
  { label: 'Under $600K', min: '', max: '600000' },
  { label: '$600K–$800K', min: '600000', max: '800000' },
  { label: '$800K–$1.1M', min: '800000', max: '1100000' },
  { label: '$1.1M–$1.5M', min: '1100000', max: '1500000' },
  { label: '$1.5M–$2M', min: '1500000', max: '2000000' },
  { label: '$2M+', min: '2000000', max: '' },
]

const BEDS_OPTIONS = [
  { label: 'Any Beds', value: '' },
  { label: '1+ Beds', value: '1' },
  { label: '2+ Beds', value: '2' },
  { label: '3+ Beds', value: '3' },
]

const LOT_SIZE_OPTIONS = [
  { label: 'Any Lot', value: '' },
  { label: '4,000+ sqft', value: '4000' },
  { label: '6,000+ sqft', value: '6000' },
  { label: '8,000+ sqft', value: '8000' },
  { label: '10,000+ sqft', value: '10000' },
]

const ACTIVE_SORTS = [
  { label: 'Newest', value: '' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
  { label: 'Most Beds', value: 'beds' },
  { label: 'Days on Market', value: 'dom' },
]

const SOLD_SORTS = [
  { label: 'Newest Sold', value: '' },
  { label: 'Price ↑', value: 'price_asc' },
  { label: 'Price ↓', value: 'price_desc' },
]

const selectStyle: React.CSSProperties = {
  padding: '6px 28px 6px 10px',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: '#fff',
  color: 'var(--text)',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  minWidth: 110,
}

const activatedSelectStyle: React.CSSProperties = {
  ...selectStyle,
  borderColor: 'var(--primary-bg)',
  fontWeight: 700,
  color: 'var(--primary-bg)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const CHEVRON_GREY = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`
const CHEVRON_WHITE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`

function mobilePill(active: boolean): React.CSSProperties {
  return {
    padding: '7px 30px 7px 13px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    border: `1.5px solid ${active ? 'var(--primary-bg)' : 'var(--border)'}`,
    borderRadius: 20,
    background: active ? 'var(--primary-bg)' : '#fff',
    color: active ? '#fff' : 'var(--text)',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: active ? CHEVRON_WHITE : CHEVRON_GREY,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }
}

interface Props {
  params: Record<string, string>
  isSold: boolean
  showSubareaFilter: boolean
  subareas: string[]
  lockedType?: string
  pathSubarea?: string
  pathBeds?: string
  priceReducedPath?: boolean
}

// SEO audit note: all filter changes in this component use router.push() (programmatic
// navigation), not <a> tags. Crawlers cannot follow these URLs, so rel="nofollow" is not
// applicable here. The only <a> tags are the Active/Sold toggle links below — those
// represent meaningful content distinctions (active vs sold listings) and remain followable.
export default function FilterDropdowns({
  params,
  isSold,
  showSubareaFilter,
  subareas,
  lockedType,
  pathSubarea,
  pathBeds,
  priceReducedPath,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const navigate = (url: string) => startTransition(() => router.push(url))
  const { signal } = useListingsProgress()

  // Propagate this component's pending state to the shared progress bar
  useEffect(() => { signal(isPending) }, [isPending, signal])

  function getTypedBasePath(): string {
    let base = pathname
    const bedsSuffix = pathBeds ? `/${pathBeds}-bedrooms` : null
    if (bedsSuffix && base.endsWith(bedsSuffix)) base = base.slice(0, -bedsSuffix.length)
    const subareaSuffix = pathSubarea ? `/${pathSubarea}` : null
    if (subareaSuffix && base.endsWith(subareaSuffix)) base = base.slice(0, -subareaSuffix.length)
    if (priceReducedPath && base.endsWith('/price-reduced')) base = base.slice(0, -'/price-reduced'.length)
    return base
  }

  const isPathMode = pathSubarea !== undefined || (lockedType && priceReducedPath)

  function filterLink(overrides: Record<string, string>) {
    const merged: Record<string, string> = { ...params, ...overrides }
    if (lockedType) {
      delete merged.type
    } else if (merged.type) {
      merged.type = merged.type.toLowerCase()
    }
    if (merged.subarea) merged.subarea = normalizeToSubareaSlug(merged.subarea)
    Object.keys(merged).forEach(k => { if (!merged[k]) delete merged[k] })
    const q = new URLSearchParams(merged).toString()
    return q ? `${pathname}?${q}` : pathname
  }

  function handleSubareaChange(newSlug: string) {
    if (isPathMode) {
      const base = getTypedBasePath()
      if (!newSlug) {
        navigate(base)
      } else {
        const bedsSegment = pathBeds ? `/${pathBeds}-bedrooms` : ''
        navigate(`${base}/${newSlug}${bedsSegment}`)
      }
    } else {
      navigate(filterLink({ subarea: newSlug, page: '' }))
    }
  }

  function handleBedsChange(newBeds: string) {
    if (lockedType && pathSubarea) {
      const base = getTypedBasePath()
      if (!newBeds) {
        navigate(`${base}/${pathSubarea}`)
      } else {
        navigate(`${base}/${pathSubarea}/${newBeds}-bedrooms`)
      }
    } else {
      navigate(filterLink({ beds: newBeds, page: '' }))
    }
  }

  function handlePriceReducedToggle() {
    if (lockedType) {
      const base = getTypedBasePath()
      if (priceReducedPath) {
        navigate(base)
      } else {
        navigate(`${base}/price-reduced`)
      }
    } else {
      const on = params.price_reduced === '1'
      navigate(filterLink({ price_reduced: on ? '' : '1', page: '' }))
    }
  }

  function handleNewBuildsToggle() {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1  // 1-12
    // Jan–Apr: widen to previous year (fewer new builds have closed yet);
    // May–Dec: current year only.
    const newBuildYear = currentMonth <= 4 ? currentYear - 1 : currentYear

    // If currently on a path-based built-{year} page, toggle OFF navigates
    // back to the parent subarea page (the built-year is in the URL path, not
    // a query param, so clearing ?min_year= would have no effect).
    const builtYearPathMatch = pathname.match(/^(.*\/homes-for-sale\/[^/]+)\/built-\d{4}$/)
    if (builtYearPathMatch) {
      navigate(builtYearPathMatch[1])
      return
    }

    // If a subarea is already in the URL path and we're on homes-for-sale,
    // navigate to the canonical SEO path page instead of a query param.
    // built-{year} pages only exist under homes-for-sale, not houses/condos/etc.
    const typedBase = getTypedBasePath()
    if (pathSubarea && typedBase.endsWith('/homes-for-sale') && !params.min_year) {
      navigate(`${typedBase}/${pathSubarea}/built-${newBuildYear}`)
      return
    }

    // Default: query-param toggle (no subarea in path, or non-homes-for-sale type)
    const on = !!params.min_year
    navigate(filterLink({ min_year: on ? '' : String(newBuildYear), page: '' }))
  }

  function handleSuiteToggle(key: string) {
    const on = params[key] === '1'
    const clearAll = { with_suite: '', legal_suite: '', two_suites: '', coach_home: '', laneway_house: '', page: '' }
    if (on) {
      navigate(filterLink(clearAll))
    } else if (key === 'legal_suite') {
      navigate(filterLink({ ...clearAll, legal_suite: '1', with_suite: '1' }))
    } else {
      navigate(filterLink({ ...clearAll, [key]: '1' }))
    }
  }

  const SORTS = isSold ? SOLD_SORTS : ACTIVE_SORTS

  const subareaActive   = !!(params.subarea) || !!pathSubarea
  const currentPriceIdx = PRICE_OPTIONS.findIndex(
    o => (params.min_price || '') === o.min && (params.max_price || '') === o.max,
  )
  const priceActive      = currentPriceIdx > 0
  const bedsActive       = !!(params.beds) || !!pathBeds
  const sortActive       = !!(params.sort)
  const currentSubareaSlug = pathSubarea || params.subarea || ''
  const currentBeds        = pathBeds || params.beds || ''
  const isPriceReduced     = priceReducedPath || params.price_reduced === '1'
  const isNewBuilds        = !!params.min_year
  const isHouseType        = lockedType === 'House' || params.type?.toLowerCase() === 'house'
  const isTownhouseType    = lockedType === 'Townhouse' || params.type?.toLowerCase() === 'townhouse'
  const showSuiteFilters   = (isHouseType || isTownhouseType) && !isSold
  const lotSizeActive      = !!params.min_lot_size

  const isWithSuite    = params.with_suite    === '1'
  const isTwoSuites    = params.two_suites    === '1'
  const isCoachHome    = params.coach_home    === '1'
  const isLanewayHouse = params.laneway_house === '1'
  const isLegalSuite   = params.legal_suite   === '1'

  function suiteBtnStyleMobile(active: boolean, color = 'var(--primary-bg)'): React.CSSProperties {
    return {
      flexShrink: 0, padding: '7px 14px', fontSize: 13, fontWeight: active ? 700 : 500,
      border: `1.5px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 20, background: active ? color : '#fff',
      color: active ? '#fff' : 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap',
    }
  }

  function suiteBtnStyleDesktop(active: boolean, color = 'var(--primary-bg)'): React.CSSProperties {
    return {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', fontSize: 12, fontWeight: 700,
      border: `1px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 6, background: active ? color : '#fff',
      color: active ? '#fff' : 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap',
    }
  }

  const activeSoldToggle = (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
      <a
        href={filterLink({ status: '', page: '' })}
        onClick={(e) => { if (e.button === 0 && !e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(filterLink({ status: '', page: '' })) } }}
        style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: !isSold ? 'var(--primary-bg)' : '#fff',
          color: !isSold ? '#fff' : 'var(--text)',
          textDecoration: 'none', whiteSpace: 'nowrap',
          borderRight: '1px solid var(--border)',
        }}
      >Active</a>
      <a
        href={filterLink({ status: 'sold', page: '' })}
        onClick={(e) => { if (e.button === 0 && !e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(filterLink({ status: 'sold', page: '' })) } }}
        style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: isSold ? 'var(--primary-bg)' : '#fff',
          color: isSold ? '#fff' : 'var(--text)',
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >Sold</a>
    </div>
  )

  return (
    <>
      <style>{`
        .fd-mobile { display: none; }
        .fd-desktop { display: flex; }
        @media (max-width: 767px) {
          .fd-mobile { display: block; }
          .fd-desktop { display: none !important; }
        }
        .fd-pill-row { scrollbar-width: none; -ms-overflow-style: none; }
        .fd-pill-row::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Mobile layout */}
      <div className="fd-mobile" style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
        <div className="fd-pill-row" style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
          {activeSoldToggle}

          <select style={mobilePill(bedsActive)} value={currentBeds} onChange={e => handleBedsChange(e.target.value)}>
            {BEDS_OPTIONS.map(b => <option key={b.label} value={b.value}>{b.label}</option>)}
          </select>

          <select
            style={mobilePill(priceActive)}
            value={currentPriceIdx >= 0 ? String(currentPriceIdx) : '0'}
            onChange={e => {
              const opt = PRICE_OPTIONS[parseInt(e.target.value)]
              navigate(filterLink({ min_price: opt.min, max_price: opt.max, page: '' }))
            }}
          >
            {PRICE_OPTIONS.map((o, i) => <option key={o.label} value={String(i)}>{o.label}</option>)}
          </select>

          <select style={mobilePill(sortActive)} value={params.sort || ''} onChange={e => navigate(filterLink({ sort: e.target.value, page: '' }))}>
            {SORTS.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
          </select>

          {showSubareaFilter && (
            <select style={mobilePill(subareaActive)} value={currentSubareaSlug} onChange={e => handleSubareaChange(e.target.value)}>
              <option value=''>All Areas</option>
              {subareas.map(mlsLabel => {
                const slug  = toSubareaSlug(mlsLabel)
                const label = subareaDisplayName(mlsLabel)
                return <option key={slug} value={slug}>{label}</option>
              })}
            </select>
          )}

          {isHouseType && !isSold && (
            <select style={mobilePill(lotSizeActive)} value={params.min_lot_size || ''} onChange={e => navigate(filterLink({ min_lot_size: e.target.value, page: '' }))}>
              {LOT_SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}

          {!isSold && (
            <button type="button" onClick={handlePriceReducedToggle} style={suiteBtnStyleMobile(isPriceReduced, '#dc2626')} aria-pressed={isPriceReduced}>
              Price reduced
            </button>
          )}

          {!isSold && (
            <button type="button" onClick={handleNewBuildsToggle} style={suiteBtnStyleMobile(isNewBuilds, 'var(--brand-accent)')} aria-pressed={isNewBuilds}>
              New builds
            </button>
          )}

          {showSuiteFilters && (
            <button type="button" onClick={() => handleSuiteToggle('with_suite')} style={suiteBtnStyleMobile(isWithSuite, '#7c3aed')} aria-pressed={isWithSuite}>
              With Suite
            </button>
          )}

          {showSuiteFilters && isHouseType && (
            <>
              <button type="button" onClick={() => handleSuiteToggle('legal_suite')} style={suiteBtnStyleMobile(isLegalSuite, '#7c3aed')} aria-pressed={isLegalSuite}>
                Legal Suite
              </button>
              <button type="button" onClick={() => handleSuiteToggle('two_suites')} style={suiteBtnStyleMobile(isTwoSuites, '#7c3aed')} aria-pressed={isTwoSuites}>
                2 Suites
              </button>
              <button type="button" onClick={() => handleSuiteToggle('coach_home')} style={suiteBtnStyleMobile(isCoachHome, '#7c3aed')} aria-pressed={isCoachHome}>
                Coach Home
              </button>
              <button type="button" onClick={() => handleSuiteToggle('laneway_house')} style={suiteBtnStyleMobile(isLanewayHouse, '#7c3aed')} aria-pressed={isLanewayHouse}>
                Laneway House
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="fd-desktop" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>

        {activeSoldToggle}

        {showSubareaFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={labelStyle}>Area</span>
            <select
              style={subareaActive ? activatedSelectStyle : selectStyle}
              value={currentSubareaSlug}
              onChange={e => handleSubareaChange(e.target.value)}
            >
              <option value=''>All Areas</option>
              {subareas.map(mlsLabel => {
                const slug  = toSubareaSlug(mlsLabel)
                const label = subareaDisplayName(mlsLabel)
                return <option key={slug} value={slug}>{label}</option>
              })}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={labelStyle}>Beds</span>
          <select
            style={bedsActive ? activatedSelectStyle : selectStyle}
            value={currentBeds}
            onChange={e => handleBedsChange(e.target.value)}
          >
            {BEDS_OPTIONS.map(b => (
              <option key={b.label} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>

        {isHouseType && !isSold && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={labelStyle}>Lot Size</span>
            <select
              style={lotSizeActive ? activatedSelectStyle : selectStyle}
              value={params.min_lot_size || ''}
              onChange={e => navigate(filterLink({ min_lot_size: e.target.value, page: '' }))}
            >
              {LOT_SIZE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={labelStyle}>Price</span>
          <select
            style={priceActive ? activatedSelectStyle : selectStyle}
            value={currentPriceIdx >= 0 ? String(currentPriceIdx) : '0'}
            onChange={e => {
              const opt = PRICE_OPTIONS[parseInt(e.target.value)]
              navigate(filterLink({ min_price: opt.min, max_price: opt.max, page: '' }))
            }}
          >
            {PRICE_OPTIONS.map((o, i) => (
              <option key={o.label} value={String(i)}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={labelStyle}>Sort</span>
          <select
            style={sortActive ? activatedSelectStyle : selectStyle}
            value={params.sort || ''}
            onChange={e => navigate(filterLink({ sort: e.target.value, page: '' }))}
          >
            {SORTS.map(s => (
              <option key={s.label} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {!isSold && (
          <button type="button" onClick={handlePriceReducedToggle} style={suiteBtnStyleDesktop(isPriceReduced, '#dc2626')} aria-pressed={isPriceReduced}>
            Price reduced
          </button>
        )}

        {!isSold && (
          <button type="button" onClick={handleNewBuildsToggle} style={suiteBtnStyleDesktop(isNewBuilds, 'var(--brand-accent)')} aria-pressed={isNewBuilds}>
            New builds
          </button>
        )}

        {showSuiteFilters && (
          <button type="button" onClick={() => handleSuiteToggle('with_suite')} style={suiteBtnStyleDesktop(isWithSuite, '#7c3aed')} aria-pressed={isWithSuite}>
            With Suite
          </button>
        )}

        {showSuiteFilters && isHouseType && (
          <>
            <button type="button" onClick={() => handleSuiteToggle('legal_suite')} style={suiteBtnStyleDesktop(isLegalSuite, '#7c3aed')} aria-pressed={isLegalSuite}>
              Legal Suite
            </button>
            <button type="button" onClick={() => handleSuiteToggle('two_suites')} style={suiteBtnStyleDesktop(isTwoSuites, '#7c3aed')} aria-pressed={isTwoSuites}>
              2 Suites
            </button>
            <button type="button" onClick={() => handleSuiteToggle('coach_home')} style={suiteBtnStyleDesktop(isCoachHome, '#7c3aed')} aria-pressed={isCoachHome}>
              Coach Home
            </button>
            <button type="button" onClick={() => handleSuiteToggle('laneway_house')} style={suiteBtnStyleDesktop(isLanewayHouse, '#7c3aed')} aria-pressed={isLanewayHouse}>
              Laneway House
            </button>
          </>
        )}
      </div>
    </>
  )
}
