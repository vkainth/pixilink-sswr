'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminAreaComparison } from '@/lib/admin-api'

interface Props {
  agentId: number
}

const EMPTY_FORM: Omit<AdminAreaComparison, 'id' | 'agent_id' | 'created_at' | 'updated_at'> = {
  slug: '',
  title: '',
  intro: '',
  area_a_subarea_slug: '',
  area_a_label: '',
  area_a_buyer_profile: '',
  area_a_pros: [],
  area_a_cons: [],
  area_b_subarea_slug: '',
  area_b_label: '',
  area_b_buyer_profile: '',
  area_b_pros: [],
  area_b_cons: [],
  verdict: '',
  status: 'draft',
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

function listToText(list: string[]): string {
  return list.join('\n')
}

function textToList(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

export default function AreaComparisonsPanel({ agentId }: Props) {
  const [items, setItems] = useState<AdminAreaComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminAreaComparison | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aProsRaw, setAProsRaw] = useState('')
  const [aConsRaw, setAConsRaw] = useState('')
  const [bProsRaw, setBProsRaw] = useState('')
  const [bConsRaw, setBConsRaw] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/agents/${agentId}/area-comparisons`, { cache: 'no-store' })
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])

  function openEdit(item: AdminAreaComparison) {
    setEditing(item)
    setCreating(false)
    setForm({
      slug: item.slug,
      title: item.title,
      intro: item.intro,
      area_a_subarea_slug: item.area_a_subarea_slug,
      area_a_label: item.area_a_label,
      area_a_buyer_profile: item.area_a_buyer_profile,
      area_a_pros: item.area_a_pros,
      area_a_cons: item.area_a_cons,
      area_b_subarea_slug: item.area_b_subarea_slug,
      area_b_label: item.area_b_label,
      area_b_buyer_profile: item.area_b_buyer_profile,
      area_b_pros: item.area_b_pros,
      area_b_cons: item.area_b_cons,
      verdict: item.verdict,
      status: item.status,
      meta_title: item.meta_title,
      meta_description: item.meta_description,
    })
    setAProsRaw(listToText(item.area_a_pros))
    setAConsRaw(listToText(item.area_a_cons))
    setBProsRaw(listToText(item.area_b_pros))
    setBConsRaw(listToText(item.area_b_cons))
    setError(null)
  }

  function openCreate() {
    setEditing(null)
    setCreating(true)
    setForm(EMPTY_FORM)
    setAProsRaw('')
    setAConsRaw('')
    setBProsRaw('')
    setBConsRaw('')
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  function buildPayload() {
    return {
      ...form,
      area_a_pros: textToList(aProsRaw),
      area_a_cons: textToList(aConsRaw),
      area_b_pros: textToList(bProsRaw),
      area_b_cons: textToList(bConsRaw),
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = buildPayload()
      const url = editing
        ? `/api/admin/agents/${agentId}/area-comparisons/${editing.id}`
        : `/api/admin/agents/${agentId}/area-comparisons`
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

  async function handleDelete(item: AdminAreaComparison) {
    if (!confirm(`Delete comparison "${item.title}"?`)) return
    const res = await fetch(`/api/admin/agents/${agentId}/area-comparisons/${item.id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const isOpen = editing !== null || creating

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: P.text, margin: 0 }}>Area Comparisons</h1>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0' }}>
            Staff-curated "Area A vs Area B" comparison pages for this agent
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
          + New Comparison
        </button>
      </div>

      {loading ? (
        <div style={{ color: P.muted, fontSize: 14 }}>Loading…</div>
      ) : items.length === 0 && !isOpen ? (
        <div style={{
          background: '#fff', border: `1px dashed ${P.border}`, borderRadius: 10,
          padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14,
        }}>
          No comparisons yet. Click <strong>+ New Comparison</strong> to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>
                  {item.title}
                  <span className="badge" style={{
                    marginLeft: 10, background: item.status === 'published' ? '#e3fcef' : '#f4f5f7',
                    color: item.status === 'published' ? '#006644' : '#5e6c84',
                  }}>
                    {item.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 3 }}>
                  /compare/{item.slug} · {item.area_a_label} vs {item.area_b_label}
                </div>
              </div>
              <button
                onClick={() => openEdit(item)}
                style={{ padding: '6px 14px', background: '#f1f5f9', border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: P.text, fontFamily: 'inherit' }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item)}
                style={{ padding: '6px 12px', background: 'none', border: `1px solid #fca5a5`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: P.danger, fontFamily: 'inherit' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div style={{
          background: '#fff', border: `1px solid ${P.border}`, borderRadius: 10,
          padding: '28px 24px', marginTop: 8,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: P.text, margin: '0 0 20px' }}>
            {editing ? 'Edit Comparison' : 'New Comparison'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug (URL)</span>
              <input type="text" placeholder="south-surrey-vs-white-rock" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'draft' | 'published' }))} style={inputStyle}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</span>
              <input type="text" placeholder="South Surrey vs White Rock: Which Is Right for You?" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intro</span>
              <textarea rows={3} value={form.intro} onChange={e => setForm(f => ({ ...f, intro: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            {/* Area A */}
            <div style={{ padding: 16, background: P.bg, borderRadius: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: P.text, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Area A</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Subarea Slug</span>
                  <input type="text" placeholder="south-surrey-white-rock" value={form.area_a_subarea_slug}
                    onChange={e => setForm(f => ({ ...f, area_a_subarea_slug: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Label</span>
                  <input type="text" placeholder="South Surrey" value={form.area_a_label}
                    onChange={e => setForm(f => ({ ...f, area_a_label: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Buyer Profile</span>
                  <textarea rows={2} value={form.area_a_buyer_profile}
                    onChange={e => setForm(f => ({ ...f, area_a_buyer_profile: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Pros (one per line)</span>
                  <textarea rows={4} value={aProsRaw} onChange={e => setAProsRaw(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Cons (one per line)</span>
                  <textarea rows={3} value={aConsRaw} onChange={e => setAConsRaw(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
                </label>
              </div>
            </div>

            {/* Area B */}
            <div style={{ padding: 16, background: P.bg, borderRadius: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: P.text, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Area B</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Subarea Slug</span>
                  <input type="text" placeholder="white-rock" value={form.area_b_subarea_slug}
                    onChange={e => setForm(f => ({ ...f, area_b_subarea_slug: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Label</span>
                  <input type="text" placeholder="White Rock" value={form.area_b_label}
                    onChange={e => setForm(f => ({ ...f, area_b_label: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Buyer Profile</span>
                  <textarea rows={2} value={form.area_b_buyer_profile}
                    onChange={e => setForm(f => ({ ...f, area_b_buyer_profile: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Pros (one per line)</span>
                  <textarea rows={4} value={bProsRaw} onChange={e => setBProsRaw(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: P.muted }}>Cons (one per line)</span>
                  <textarea rows={3} value={bConsRaw} onChange={e => setBConsRaw(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verdict</span>
              <textarea rows={3} value={form.verdict} onChange={e => setForm(f => ({ ...f, verdict: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta Title</span>
              <input type="text" value={form.meta_title ?? ''}
                onChange={e => setForm(f => ({ ...f, meta_title: e.target.value || null }))} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta Description</span>
              <input type="text" value={form.meta_description ?? ''}
                onChange={e => setForm(f => ({ ...f, meta_description: e.target.value || null }))} style={inputStyle} />
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
              {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Comparison')}
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
