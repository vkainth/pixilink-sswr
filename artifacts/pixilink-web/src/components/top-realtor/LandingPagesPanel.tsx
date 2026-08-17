'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminLandingPage } from '@/lib/admin-api'

interface Props {
  agentId: number
}

const EMPTY_FORM: Omit<AdminLandingPage, 'id' | 'agent_id' | 'created_at' | 'updated_at'> = {
  city_slug: '',
  city_display_name: '',
  area_slug: '',
  area_display_name: '',
  province: 'BC',
  respond_time_label: '15 min',
  award_badges: [],
  stat_years_exp: null,
  stat_sold_volume: null,
  stat_team_size: null,
  stat_award_label: null,
  value_prop_cards: [],
  testimonials: [],
  meta_title: null,
  meta_description: null,
}

const P = {
  primary: '#23a9e1',
  bg: '#f1f5f9',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  danger: '#dc2626',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: `1px solid ${P.border}`,
  borderRadius: 6, fontSize: 13, color: P.text, background: '#fff',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

export default function LandingPagesPanel({ agentId }: Props) {
  const [pages, setPages] = useState<AdminLandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminLandingPage | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [badgesRaw, setBadgesRaw] = useState('')
  const [cardsRaw, setCardsRaw] = useState('')
  const [testsRaw, setTestsRaw] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/agents/${agentId}/landing-pages`, { cache: 'no-store' })
    if (res.ok) setPages(await res.json())
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])

  function openEdit(page: AdminLandingPage) {
    setEditing(page)
    setCreating(false)
    setForm({
      city_slug: page.city_slug,
      city_display_name: page.city_display_name,
      area_slug: page.area_slug ?? '',
      area_display_name: page.area_display_name,
      province: page.province,
      respond_time_label: page.respond_time_label,
      award_badges: page.award_badges,
      stat_years_exp: page.stat_years_exp,
      stat_sold_volume: page.stat_sold_volume,
      stat_team_size: page.stat_team_size,
      stat_award_label: page.stat_award_label,
      value_prop_cards: page.value_prop_cards,
      testimonials: page.testimonials,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
    })
    setBadgesRaw(page.award_badges.join('\n'))
    setCardsRaw(JSON.stringify(page.value_prop_cards, null, 2))
    setTestsRaw(JSON.stringify(page.testimonials, null, 2))
    setError(null)
  }

  function openCreate() {
    setEditing(null)
    setCreating(true)
    setForm(EMPTY_FORM)
    setBadgesRaw('')
    setCardsRaw('[]')
    setTestsRaw('[]')
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  function buildPayload() {
    let badges: string[] = []
    let cards: AdminLandingPage['value_prop_cards'] = []
    let tests: AdminLandingPage['testimonials'] = []
    try { badges = badgesRaw.split('\n').map(b => b.trim()).filter(Boolean) } catch { badges = [] }
    try { cards = JSON.parse(cardsRaw) } catch { throw new Error('Value prop cards JSON is invalid') }
    try { tests = JSON.parse(testsRaw) } catch { throw new Error('Testimonials JSON is invalid') }
    return {
      ...form,
      area_slug: form.area_slug?.trim() || null,
      award_badges: badges,
      value_prop_cards: cards,
      testimonials: tests,
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = buildPayload()
      const url = editing
        ? `/api/admin/agents/${agentId}/landing-pages/${editing.id}`
        : `/api/admin/agents/${agentId}/landing-pages`
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Save failed')
      }
      cancel()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
    setSaving(false)
  }

  async function handleDelete(page: AdminLandingPage) {
    if (!confirm(`Delete landing page "${page.city_display_name}${page.area_display_name ? ` / ${page.area_display_name}` : ''}"?`)) return
    const res = await fetch(`/api/admin/agents/${agentId}/landing-pages/${page.id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const isOpen = editing !== null || creating

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: P.text, margin: 0 }}>Landing Pages</h1>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0' }}>
            Top Realtor SEO landing pages for this agent
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '9px 18px', background: P.primary, color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + New Landing Page
        </button>
      </div>

      {loading ? (
        <div style={{ color: P.muted, fontSize: 14 }}>Loading…</div>
      ) : pages.length === 0 && !isOpen ? (
        <div style={{
          background: '#fff', border: `1px dashed ${P.border}`, borderRadius: 10,
          padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14,
        }}>
          No landing pages yet. Click <strong>+ New Landing Page</strong> to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {pages.map(p => (
            <div key={p.id} style={{
              background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>
                  {p.city_display_name}{p.area_display_name ? ` / ${p.area_display_name}` : ''}
                </div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 3 }}>
                  /top-realtor/{p.city_slug}{p.area_slug ? `/${p.area_slug}` : ''}
                  {p.award_badges.length > 0 && ` · ${p.award_badges.length} badge${p.award_badges.length > 1 ? 's' : ''}`}
                </div>
              </div>
              <button
                onClick={() => openEdit(p)}
                style={{ padding: '6px 14px', background: '#f1f5f9', border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: P.text, fontFamily: 'inherit' }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(p)}
                style={{ padding: '6px 12px', background: 'none', border: `1px solid #fca5a5`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: P.danger, fontFamily: 'inherit' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit / Create Form ── */}
      {isOpen && (
        <div style={{
          background: '#fff', border: `1px solid ${P.border}`, borderRadius: 10,
          padding: '28px 24px', marginTop: 8,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: P.text, margin: '0 0 20px' }}>
            {editing ? 'Edit Landing Page' : 'New Landing Page'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
            {([
              ['city_slug', 'City Slug (URL)', 'white-rock'],
              ['city_display_name', 'City Display Name', 'White Rock'],
              ['area_slug', 'Area Slug (optional)', 'ocean-park'],
              ['area_display_name', 'Area Display Name', 'Ocean Park'],
              ['province', 'Province', 'BC'],
              ['respond_time_label', 'Response Time Label', '15 min'],
              ['stat_years_exp', 'Years Experience (number)', '20'],
              ['stat_sold_volume', 'Sold Volume (text)', '$200M+'],
              ['stat_team_size', 'Team Size (number)', '1'],
              ['stat_award_label', 'Award Label', 'Top 1% Fraser Valley'],
            ] as [keyof typeof form, string, string][]).map(([key, label, placeholder]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key] === null ? '' : String(form[key])}
                  onChange={e => {
                    const v = e.target.value
                    setForm(f => ({
                      ...f,
                      [key]: ['stat_years_exp', 'stat_team_size'].includes(key)
                        ? (v === '' ? null : Number(v))
                        : (v === '' && ['stat_sold_volume', 'stat_award_label'].includes(key) ? null : v),
                    }))
                  }}
                  style={inputStyle}
                />
              </label>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta Title</span>
              <input
                type="text"
                placeholder="Top Realtor in White Rock BC | Randy Dyck"
                value={form.meta_title ?? ''}
                onChange={e => setForm(f => ({ ...f, meta_title: e.target.value || null }))}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta Description</span>
              <input
                type="text"
                placeholder="Looking for the top realtor in White Rock…"
                value={form.meta_description ?? ''}
                onChange={e => setForm(f => ({ ...f, meta_description: e.target.value || null }))}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Award Badges (one per line)</span>
              <textarea
                rows={3}
                value={badgesRaw}
                onChange={e => setBadgesRaw(e.target.value)}
                placeholder={'RE/MAX Hall of Fame\nTop 1% Fraser Valley'}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value Prop Cards (JSON array)</span>
              <textarea
                rows={8}
                value={cardsRaw}
                onChange={e => setCardsRaw(e.target.value)}
                placeholder={'[\n  {"emoji":"🏆","heading":"Top-Ranked","copy":"…"}\n]'}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
              />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Testimonials (JSON array)</span>
              <textarea
                rows={6}
                value={testsRaw}
                onChange={e => setTestsRaw(e.target.value)}
                placeholder={'[\n  {"quote":"Amazing experience…","name":"Jane S.","city":"White Rock"}\n]'}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: 12 }}
              />
            </label>
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, color: P.danger }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 20px', background: P.primary, color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Landing Page')}
            </button>
            <button
              onClick={cancel}
              style={{
                padding: '9px 18px', background: 'none', border: `1px solid ${P.border}`,
                borderRadius: 6, fontSize: 13, color: P.muted, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
