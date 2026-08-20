'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiPath } from '@/lib/admin-api-path'
import type { AdminTestimonial } from '@/lib/admin-api'

const P = {
  primary: '#23a9e1',
  border: '#e2e8f0',
  bg: '#f8fafc',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  muted: '#64748b',
  text: '#1e293b',
}

/**
 * Attribution options. 'manual' is first and default: a quote the agent supplied
 * directly should carry no platform badge, because claiming a source the review did
 * not come from is a trust problem on a public site, not a cosmetic one.
 */
const SOURCES: { value: string; label: string; hint: string }[] = [
  { value: 'manual',      label: 'Supplied directly',  hint: 'No attribution shown — use for quotes the agent gives you' },
  { value: 'google',      label: 'Google',             hint: 'Shows "via Google"' },
  { value: 'rankmyagent', label: 'RankMyAgent',        hint: 'Shows "via RankMyAgent"' },
  { value: 'rew',         label: 'REW',                hint: 'Shows "via REW"' },
  { value: 'realtylink',  label: 'Realtylink',         hint: 'Shows "via Realtylink"' },
]

const EMPTY = { author_name: '', body: '', rating: 5, source: 'manual', date: '', visible: true }
type Draft = typeof EMPTY

const input: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: `1px solid ${P.border}`, borderRadius: 6,
  fontSize: 13, color: P.text, background: '#fff', boxSizing: 'border-box',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: P.muted,
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
}
const btn = (bg: string): React.CSSProperties => ({
  padding: '9px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 6,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
})

function Stars({ n, onChange }: { n: number; onChange?: (v: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          role={onChange ? 'button' : undefined}
          tabIndex={onChange ? 0 : undefined}
          aria-label={onChange ? `${i} star${i === 1 ? '' : 's'}` : undefined}
          onClick={onChange ? () => onChange(i) : undefined}
          onKeyDown={onChange ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(i) } } : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default', color: i <= n ? P.amber : P.border, fontSize: 17, lineHeight: 1 }}
        >★</span>
      ))}
    </span>
  )
}

interface Props { agentId: number; agentName: string }

export default function TestimonialsPanel({ agentId, agentName }: Props) {
  const [rows, setRows] = useState<AdminTestimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editing, setEditing] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const base = apiPath(`/api/admin/agents/${agentId}/testimonials`)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(base)
      setRows(res.ok ? await res.json() : [])
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => { load() }, [load])

  /** Pull a readable message out of Laravel's {errors:{field:[msg]}} shape. */
  function explain(body: unknown, fallback: string): string {
    if (body && typeof body === 'object' && 'errors' in body) {
      const errs = (body as { errors: Record<string, string[]> }).errors
      const first = Object.values(errs)[0]
      if (Array.isArray(first) && first[0]) return first[0]
    }
    if (body && typeof body === 'object' && 'error' in body) {
      return String((body as { error: unknown }).error)
    }
    return fallback
  }

  async function save() {
    setBusy(true); setMsg(null)
    try {
      // Send date as null rather than '' — the column is a DATE and '' fails validation.
      const payload = { ...draft, date: draft.date || null }
      const res = await fetch(editing ? `${base}/${editing}` : base, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        setMsg({ kind: 'err', text: explain(await res.json().catch(() => null), `Save failed (${res.status})`) })
        return
      }
      setDraft(EMPTY); setEditing(null)
      setMsg({ kind: 'ok', text: editing ? 'Testimonial updated.' : 'Testimonial added.' })
      await load()
    } catch {
      setMsg({ kind: 'err', text: 'Network error — nothing was saved.' })
    } finally {
      setBusy(false)
    }
  }

  async function toggleVisible(t: AdminTestimonial) {
    setBusy(true)
    try {
      await fetch(`${base}/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !t.visible }),
      })
      await load()
    } finally { setBusy(false) }
  }

  async function remove(t: AdminTestimonial) {
    if (!confirm(`Delete the testimonial from ${t.author_name}? This cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`${base}/${t.id}`, { method: 'DELETE' })
      setMsg(res.ok ? { kind: 'ok', text: 'Deleted.' } : { kind: 'err', text: 'Delete failed.' })
      await load()
    } finally { setBusy(false) }
  }

  function edit(t: AdminTestimonial) {
    setEditing(t.id)
    setDraft({
      author_name: t.author_name, body: t.body ?? '', rating: t.rating,
      source: t.source || 'manual', date: t.date ?? '', visible: t.visible,
    })
    setMsg(null)
  }

  const hint = SOURCES.find(s => s.value === draft.source)?.hint ?? ''
  const canSave = draft.author_name.trim() !== '' && draft.body.trim() !== '' && !busy

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 21, fontWeight: 700, color: P.text, margin: '0 0 4px' }}>Testimonials</h1>
      <p style={{ fontSize: 13, color: P.muted, margin: '0 0 24px' }}>
        Reviews shown on {agentName}&apos;s site. Hidden ones stay here but are not served publicly.
      </p>

      {msg && (
        <div role="status" style={{
          padding: '10px 13px', borderRadius: 6, fontSize: 13, marginBottom: 18,
          background: msg.kind === 'ok' ? '#f0fdf4' : '#fef2f2',
          color: msg.kind === 'ok' ? P.green : P.red,
          border: `1px solid ${msg.kind === 'ok' ? P.green : P.red}33`,
        }}>{msg.text}</div>
      )}

      {/* ── Editor ── */}
      <div style={{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 20, background: P.bg, marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: P.text, margin: '0 0 16px' }}>
          {editing ? 'Edit testimonial' : 'Add a testimonial'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={label} htmlFor="t-name">Client name</label>
            <input id="t-name" style={input} value={draft.author_name} maxLength={255}
              onChange={e => setDraft({ ...draft, author_name: e.target.value })} />
          </div>
          <div>
            <label style={label} htmlFor="t-date">Date <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <input id="t-date" type="date" style={input} value={draft.date}
              onChange={e => setDraft({ ...draft, date: e.target.value })} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label} htmlFor="t-body">Quote</label>
          <textarea id="t-body" style={{ ...input, minHeight: 92, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            value={draft.body} maxLength={5000}
            onChange={e => setDraft({ ...draft, body: e.target.value })} />
          <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>{draft.body.length}/5000</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={label} htmlFor="t-source">Attribution</label>
            <select id="t-source" style={input} value={draft.source}
              onChange={e => setDraft({ ...draft, source: e.target.value })}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>{hint}</div>
          </div>
          <div>
            <label style={label}>Rating</label>
            <div style={{ paddingTop: 4 }}>
              <Stars n={draft.rating} onChange={v => setDraft({ ...draft, rating: v })} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={save} disabled={!canSave} style={{ ...btn(canSave ? P.primary : P.border), cursor: canSave ? 'pointer' : 'not-allowed' }}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add testimonial'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setDraft(EMPTY); setMsg(null) }}
              style={{ ...btn('#fff'), color: P.muted, border: `1px solid ${P.border}` }}>Cancel</button>
          )}
          <label style={{ marginLeft: 'auto', fontSize: 12, color: P.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={draft.visible}
              onChange={e => setDraft({ ...draft, visible: e.target.checked })} />
            Visible on site
          </label>
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <p style={{ fontSize: 13, color: P.muted }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: P.muted }}>
          No testimonials yet. The section is hidden on the site until at least one is visible.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(t => (
            <div key={t.id} style={{
              border: `1px solid ${P.border}`, borderRadius: 8, padding: '14px 16px', background: '#fff',
              opacity: t.visible ? 1 : 0.55,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14, color: P.text }}>{t.author_name}</strong>
                <Stars n={t.rating} />
                {t.source && t.source !== 'manual' && (
                  <span style={{ fontSize: 11, color: P.muted }}>via {t.source}</span>
                )}
                {t.date && <span style={{ fontSize: 11, color: P.muted }}>{t.date}</span>}
                {!t.visible && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: P.amber, textTransform: 'uppercase', letterSpacing: '0.06em' }}>hidden</span>
                )}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => edit(t)} disabled={busy}
                    style={{ background: 'none', border: 'none', color: P.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => toggleVisible(t)} disabled={busy}
                    style={{ background: 'none', border: 'none', color: P.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {t.visible ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => remove(t)} disabled={busy}
                    style={{ background: 'none', border: 'none', color: P.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                </span>
              </div>
              <p style={{ fontSize: 13, color: P.text, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{t.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
