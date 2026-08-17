'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TYPES = ['', 'Apartment', 'Townhouse', 'House', 'Duplex', 'Manufactured']
const PRICE_OPTIONS = [
  { label: 'Any Price', value: '' },
  { label: 'Under $600K', value: '0-600000' },
  { label: '$600K–$800K', value: '600000-800000' },
  { label: '$800K–$1.1M', value: '800000-1100000' },
  { label: '$1.1M–$1.5M', value: '1100000-1500000' },
  { label: '$1.5M–$2M', value: '1500000-2000000' },
  { label: '$2M+', value: '2000000-' },
]
const BED_OPTIONS = [
  { label: 'Any Beds', value: '' },
  { label: '1+ beds', value: '1' },
  { label: '2+ beds', value: '2' },
  { label: '3+ beds', value: '3' },
  { label: '4+ beds', value: '4' },
]

const sel: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontFamily: 'inherit',
  outline: 'none', cursor: 'pointer', minWidth: 140,
}

export default function SearchBar({ agentPrefix = '' }: { agentPrefix?: string }) {
  const router = useRouter()
  const [type, setType] = useState('')
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState('')

  function handleSearch() {
    const qs = new URLSearchParams()
    if (type)  qs.set('type', type)
    if (beds)  qs.set('beds', beds)
    if (price) {
      const [min, max] = price.split('-')
      if (min) qs.set('min_price', min)
      if (max) qs.set('max_price', max)
    }
    router.push(`${agentPrefix}/search?${qs}`)
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', borderRadius: 10, padding: '20px 24px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
      <select value={type} onChange={e => setType(e.target.value)} style={sel}>
        <option value="">All Property Types</option>
        {TYPES.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select value={price} onChange={e => setPrice(e.target.value)} style={sel}>
        {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select value={beds} onChange={e => setBeds(e.target.value)} style={sel}>
        {BED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <button onClick={handleSearch}
        style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: '10px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
        Search Homes
      </button>
    </div>
  )
}
