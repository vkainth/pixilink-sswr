'use client'

import { useState } from 'react'

const P = {
  primary: '#23a9e1', primaryLight: '#e0f2fe',
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', error: '#ef4444', errorLight: '#fef2f2',
  success: '#22c55e', successLight: '#dcfce7',
}

const searchResults = [
  { id: 'A101', address: '2085 152 St #401, White Rock', type: 'Condo', beds: 2, price: '$749,000', img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=80&h=60&fit=crop' },
  { id: 'A102', address: '15488 Columbia Ave, White Rock', type: 'Townhouse', beds: 3, price: '$1,189,000', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=80&h=60&fit=crop' },
  { id: 'A103', address: '3476 Galloway Ave, Coquitlam', type: 'House', beds: 4, price: '$1,548,000', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=80&h=60&fit=crop' },
  { id: 'A104', address: '15230 Buena Vista Ave, White Rock', type: 'House', beds: 5, price: '$2,288,000', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=80&h=60&fit=crop' },
]

type PinnedItem = { id: string; address: string; type: string; beds: number; price: string }

const initPinned: PinnedItem[] = [
  { id: 'A101', address: '2085 152 St #401, White Rock', type: 'Condo', beds: 2, price: '$749,000' },
  { id: 'A102', address: '15488 Columbia Ave, White Rock', type: 'Townhouse', beds: 3, price: '$1,189,000' },
  { id: 'A103', address: '3476 Galloway Ave, Coquitlam', type: 'House', beds: 4, price: '$1,548,000' },
]

export default function FeaturedListingsPage() {
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState<PinnedItem[]>(initPinned)
  const [saved, setSaved] = useState(false)

  const available = searchResults.filter(r => !pinned.find(p => p.id === r.id))
  const filtered = available.filter(r => r.address.toLowerCase().includes(search.toLowerCase()) || search === '')

  function pin(r: typeof searchResults[0]) {
    if (pinned.length < 6) setPinned(p => [...p, { id: r.id, address: r.address, type: r.type, beds: r.beds, price: r.price }])
  }
  function unpin(id: string) { setPinned(p => p.filter(x => x.id !== id)) }
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Featured Listings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Pin up to 6 listings to showcase on your homepage.</p>
        </div>
        <button onClick={save} style={{ padding: '8px 18px', background: saved ? P.success : P.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {saved ? '✓ Saved!' : 'Save Order'}
        </button>
      </div>

      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Search panel */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: P.text, marginBottom: 12 }}>Search Your Listings (MLS ID: FDYCKRA)</div>
          <input placeholder="Search by address or MLS#…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => (
              <div key={r.id} style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.img} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 3 }}>{r.address}</div>
                  <div style={{ fontSize: 12, color: P.muted }}>{r.beds} bed · {r.type} · <span style={{ color: P.primary, fontWeight: 700 }}>{r.price}</span></div>
                </div>
                <button onClick={() => pin(r)} disabled={pinned.length >= 6}
                  style={{ padding: '6px 12px', background: pinned.length >= 6 ? P.bg : P.primaryLight, color: pinned.length >= 6 ? P.muted : P.primary, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: pinned.length >= 6 ? 'not-allowed' : 'pointer' }}>
                  + Pin
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ color: P.muted, fontSize: 13, textAlign: 'center', padding: 24 }}>No listings match your search.</div>}
          </div>
        </div>

        {/* Pinned panel */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: P.text, marginBottom: 4 }}>Pinned on Homepage</div>
          <div style={{ fontSize: 12, color: P.muted, marginBottom: 12 }}>{pinned.length} of 6 slots used</div>

          {pinned.length === 0 && (
            <div style={{ background: P.white, borderRadius: 10, border: `2px dashed ${P.border}`, padding: 40, textAlign: 'center', color: P.muted, fontSize: 13 }}>
              No featured listings yet. Search and pin listings from the left.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pinned.map((p, i) => (
              <div key={p.id} style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.border}`, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: P.muted, fontSize: 18, cursor: 'grab', userSelect: 'none' }}>⠿</div>
                <div style={{ width: 28, height: 28, background: P.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: P.primary, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{p.address}</div>
                  <div style={{ fontSize: 12, color: P.muted }}>{p.beds} bed · {p.type} · <span style={{ color: P.primary, fontWeight: 700 }}>{p.price}</span></div>
                </div>
                <button onClick={() => unpin(p.id)} style={{ padding: '4px 8px', background: P.errorLight, color: P.error, border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
          </div>

          {pinned.length > 0 && (
            <div style={{ marginTop: 14, padding: 14, background: P.bg, borderRadius: 8, fontSize: 12, color: P.muted }}>
              ℹ️ Changes appear on your homepage within 5 minutes after saving.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
