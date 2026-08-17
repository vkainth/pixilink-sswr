'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminBestOfList } from '@/lib/admin-api'

interface Props {
  agentId: number
}

const EMPTY_FORM: Omit<AdminBestOfList, 'id' | 'agent_id' | 'created_at' | 'updated_at'> = {
  slug: '',
  title: '',
  intro: '',
  kind: 'building',
  items: [],
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

export default function BestOfListsPanel({ agentId }: Props) {
  const [lists, setLists] = useState<AdminBestOfList[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminBestOfList | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemsRaw, setItemsRaw] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/agents/${agentId}/best-of-lists`, { cache: 'no-store' })
    if (res.ok) setLists(await res.json())
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])

  function openEdit(list: AdminBestOfList) {
    setEditing(list)
    setCreating(false)
    setForm({
      slug: list.slug,
      title: list.title,
      intro: list.intro,
      kind: list.kind,
      items: list.items,
      status: list.status,
      meta_title: list.meta_title,
      meta_description: list.meta_description,
    })
    setItemsRaw(JSON.stringify(list.items, null, 2))
    setError(null)
  }

  function openCreate() {
    setEditing(null)
    setCreating(true)
    setForm(EMPTY_FORM)
    setItemsRaw('[]')
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  function buildPayload() {
    let items: AdminBestOfList['items'] = []
    try { items = JSON.parse(itemsRaw) } catch { throw new Error('Items JSON is invalid') }
    return { ...form, items }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = buildPayload()
      const url = editing
        ? `/api/admin/agents/${agentId}/best-of-lists/${editing.id}`
        : `/api/admin/agents/${agentId}/best-of-lists`
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

  async function handleDelete(list: AdminBestOfList) {
    if (!confirm(`Delete list "${list.title}"?`)) return
    const res = await fetch(`/api/admin/agents/${agentId}/best-of-lists/${list.id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const isOpen = editing !== null || creating

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: P.text, margin: 0 }}>Best-Of Lists</h1>
          <p style={{ fontSize: 13, color: P.muted, margin: '4px 0 0' }}>
            Staff-curated "best of" ranking pages (buildings or neighbourhoods) for this agent
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
          + New List
        </button>
      </div>

      {loading ? (
        <div style={{ color: P.muted, fontSize: 14 }}>Loading…</div>
      ) : lists.length === 0 && !isOpen ? (
        <div style={{
          background: '#fff', border: `1px dashed ${P.border}`, borderRadius: 10,
          padding: '40px 24px', textAlign: 'center', color: P.muted, fontSize: 14,
        }}>
          No lists yet. Click <strong>+ New List</strong> to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {lists.map(list => (
            <div key={list.id} style={{
              background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>
                  {list.title}
                  <span className="badge" style={{
                    marginLeft: 10, background: list.status === 'published' ? '#e3fcef' : '#f4f5f7',
                    color: list.status === 'published' ? '#006644' : '#5e6c84',
                  }}>
                    {list.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 3 }}>
                  /best/{list.slug} · {list.kind} · {list.items.length} item{list.items.length === 1 ? '' : 's'}
                </div>
              </div>
              <button
                onClick={() => openEdit(list)}
                style={{ padding: '6px 14px', background: '#f1f5f9', border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: P.text, fontFamily: 'inherit' }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(list)}
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
            {editing ? 'Edit List' : 'New List'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 20px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug (URL)</span>
              <input type="text" placeholder="best-condo-buildings-white-rock" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kind</span>
              <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as 'building' | 'area' }))} style={inputStyle}>
                <option value="building">Building</option>
                <option value="area">Area</option>
              </select>
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
              <input type="text" placeholder="Best Condo Buildings in White Rock" value={form.title}
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

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Items (JSON array — slug, label, type, blurb, image_url?)
              </span>
              <textarea
                rows={12}
                value={itemsRaw}
                onChange={e => setItemsRaw(e.target.value)}
                placeholder={'[\n  {"slug":"foster-martin-the-1500-st","label":"Foster Martin | The Martin","type":"building","blurb":"…"}\n]'}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 220, fontFamily: 'monospace', fontSize: 12 }}
              />
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
              {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create List')}
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
