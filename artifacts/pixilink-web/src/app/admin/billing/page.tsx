'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiPath } from '@/lib/admin-api-path'
import type { AdminBillingAgent, AdminBillingListResponse } from '@/lib/admin-api'

const C = {
  bg: '#f1f5f9', white: '#ffffff', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', primary: '#23a9e1', danger: '#ef4444',
  success: '#22c55e', warning: '#f59e0b',
}

function btnStyle(bg: string, color = '#fff', disabled = false): React.CSSProperties {
  return {
    padding: '5px 11px', borderRadius: 7, border: 'none', background: disabled ? '#94a3b8' : bg,
    color, fontSize: 11, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  }
}

function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:     { bg: '#f0fdf4', color: '#166534', label: '✓ Active' },
    past_due:   { bg: '#fffbeb', color: '#92400e', label: '⚠ Past Due' },
    cancelling: { bg: '#eff6ff', color: '#1d4ed8', label: '↩ Cancelling' },
    suspended:  { bg: '#fef2f2', color: '#991b1b', label: '✕ Suspended' },
    canceled:   { bg: '#f8fafc', color: '#64748b', label: '— Canceled' },
    none:       { bg: '#f8fafc', color: '#94a3b8', label: '· No sub' },
  }
  const b = map[s] ?? map.none
  return (
    <span style={{ background: b.bg, color: b.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
      {b.label}
    </span>
  )
}

function tierLabel(tier: string | null) {
  if (!tier) return <span style={{ color: C.muted, fontSize: 12 }}>—</span>
  const map: Record<string, string> = { hub: 'Area Hub ($2,500/mo)', personal: 'Personal ($150/mo)' }
  return map[tier] ?? tier
}

type Modal =
  | { kind: 'create'; agent: AdminBillingAgent }
  | { kind: 'charge'; agent: AdminBillingAgent }
  | { kind: 'portal-result'; agent: AdminBillingAgent; url: string; emailSent: boolean; emailTo: string | null; emailError: string | null }

export default function AdminBillingPage() {
  const [data, setData] = useState<AdminBillingListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionState, setActionState] = useState<Record<number, string>>({})
  const [modal, setModal] = useState<Modal | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Create subscription form state
  const todayStr = new Date().toISOString().slice(0, 10)
  const [createForm, setCreateForm] = useState({ tier: 'personal', email: '', start_date: todayStr })
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // One-time charge form state
  const [chargeForm, setChargeForm] = useState({ amount: '', description: '' })
  const [chargeError, setChargeError] = useState('')
  const [chargeLoading, setChargeLoading] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiPath('/api/admin/billing'))
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const agents = data
    ? (statusFilter ? data.agents.filter(a => a.billing_status === statusFilter) : data.agents)
    : []

  async function doAction(agentId: number, path: string, method = 'POST') {
    setActionState(s => ({ ...s, [agentId]: 'loading' }))
    try {
      const res = await fetch(apiPath(`/api/admin/billing/${agentId}/${path}`), { method })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(json.message || 'Done.')
        await load()
      } else {
        showToast(json.error || 'Action failed.', false)
      }
    } catch {
      showToast('Network error.', false)
    } finally {
      setActionState(s => ({ ...s, [agentId]: '' }))
    }
  }

  async function emailPortalLink(agent: AdminBillingAgent) {
    setActionState(s => ({ ...s, [agent.id]: 'portal' }))
    try {
      const res = await fetch(apiPath(`/api/admin/billing/${agent.id}/email-portal`), { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.url) {
        setModal({
          kind: 'portal-result',
          agent,
          url: json.url,
          emailSent: json.email_sent ?? false,
          emailTo: json.email_to ?? null,
          emailError: json.email_error ?? null,
        })
      } else {
        showToast(json.error || 'Could not generate portal link.', false)
      }
    } catch {
      showToast('Network error.', false)
    } finally {
      setActionState(s => ({ ...s, [agent.id]: '' }))
    }
  }

  async function handleCreate() {
    if (modal?.kind !== 'create') return
    if (!createForm.email) { setCreateError('Email is required.'); return }
    setCreateError('')
    setCreateLoading(true)
    try {
      const body: Record<string, string | number> = { tier: createForm.tier, email: createForm.email }
      if (createForm.start_date) {
        body.billing_cycle_anchor = Math.floor(new Date(createForm.start_date).getTime() / 1000)
      }
      const res = await fetch(apiPath(`/api/admin/billing/${modal.agent.id}/subscription`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(json.message || 'Subscription created.')
        setModal(null)
        await load()
      } else {
        setCreateError(json.error || 'Failed to create subscription.')
      }
    } catch {
      setCreateError('Network error.')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleCharge() {
    if (modal?.kind !== 'charge') return
    const amountCents = Math.round(parseFloat(chargeForm.amount || '0') * 100)
    if (amountCents < 100) { setChargeError('Minimum charge is $1.00 CAD.'); return }
    if (!chargeForm.description.trim()) { setChargeError('Description is required.'); return }
    setChargeError('')
    setChargeLoading(true)
    try {
      const res = await fetch(apiPath(`/api/admin/billing/${modal.agent.id}/charge`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: amountCents, description: chargeForm.description.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(json.message || `Charged ${json.amount ?? chargeForm.amount} successfully.`)
        setModal(null)
        setChargeForm({ amount: '', description: '' })
      } else {
        setChargeError(json.error || 'Charge failed.')
      }
    } catch {
      setChargeError('Network error.')
    } finally {
      setChargeLoading(false)
    }
  }

  const mrrFormatted = data ? `$${(data.mrr).toLocaleString()}/mo` : '—'
  const activeCount  = data ? data.agents.filter(a => a.billing_status === 'active').length : 0
  const pastDueCount = data ? data.agents.filter(a => a.billing_status === 'past_due').length : 0

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`,
    borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.ok ? '#166534' : '#991b1b',
          color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', maxWidth: 400,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Create Subscription Modal */}
      {modal?.kind === 'create' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Create Subscription</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Agent: <strong>{modal.agent.name}</strong></div>

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Billing Tier</label>
            <select
              value={createForm.tier}
              onChange={e => setCreateForm(f => ({ ...f, tier: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 16 }}
            >
              <option value="personal">Personal Site — $150/mo</option>
              <option value="hub">Area Hub — $2,500/mo</option>
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Agent Email (Stripe customer)</label>
            <input
              type="email"
              value={createForm.email}
              onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
              placeholder={modal.agent.notification_email ?? 'agent@example.com'}
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            {modal.agent.notification_email && (
              <div
                style={{ fontSize: 11, color: C.primary, marginBottom: 12, cursor: 'pointer' }}
                onClick={() => setCreateForm(f => ({ ...f, email: modal.agent.notification_email! }))}
              >
                ↑ Use: {modal.agent.notification_email}
              </div>
            )}
            {!modal.agent.notification_email && <div style={{ marginBottom: 12 }} />}

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>
              Billing Start Date
              <span style={{ fontWeight: 400, marginLeft: 6 }}>— first full billing cycle starts on this date</span>
            </label>
            <input
              type="date"
              value={createForm.start_date}
              onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 4 }}
            />
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
              Today = charge immediately. Future date = prorate from today → start date.
            </div>

            {createError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12 }}>{createError}</div>}

            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, padding: '10px 14px', background: C.bg, borderRadius: 8 }}>
              Creates an <strong>incomplete</strong> subscription. After creating, click{' '}
              <em>Email Portal Link</em> to send the agent a payment-method collection link.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={btnStyle(C.white, C.muted)}>Cancel</button>
              <button onClick={handleCreate} disabled={createLoading} style={btnStyle(C.primary, '#fff', createLoading)}>
                {createLoading ? 'Creating…' : 'Create Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Charge Modal */}
      {modal?.kind === 'charge' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>One-Time Charge</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Agent: <strong>{modal.agent.name}</strong></div>

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Amount (CAD $)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={chargeForm.amount}
              onChange={e => setChargeForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 250.00"
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Description</label>
            <input
              type="text"
              value={chargeForm.description}
              onChange={e => setChargeForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Setup fee, Additional territory"
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            {chargeError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 12 }}>{chargeError}</div>}

            <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 20, padding: '10px 14px', background: '#f5f3ff', borderRadius: 8 }}>
              Charges the agent&apos;s <strong>default payment method on file</strong> immediately via Stripe. Requires an active subscription with a card saved.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setChargeForm({ amount: '', description: '' }); setChargeError('') }} style={btnStyle(C.white, C.muted)}>Cancel</button>
              <button onClick={handleCharge} disabled={chargeLoading} style={btnStyle('#7c3aed', '#fff', chargeLoading)}>
                {chargeLoading ? 'Charging…' : 'Charge Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Link Result Modal */}
      {modal?.kind === 'portal-result' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Billing Portal Link</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Agent: <strong>{modal.agent.name}</strong></div>

            {/* Email status */}
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginBottom: 16,
              background: modal.emailSent ? '#f0fdf4' : modal.emailError ? '#fef2f2' : '#fafafa',
              border: `1px solid ${modal.emailSent ? '#bbf7d0' : modal.emailError ? '#fecaca' : C.border}`,
            }}>
              {modal.emailSent ? (
                <div style={{ fontSize: 13, color: '#166534' }}>
                  ✓ Email sent to <strong>{modal.emailTo}</strong>
                </div>
              ) : modal.emailTo ? (
                <div style={{ fontSize: 13, color: '#991b1b' }}>
                  ✕ Email failed: {modal.emailError}<br />
                  <span style={{ fontSize: 11, color: C.muted }}>Copy the link below and send it manually.</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.muted }}>
                  No notification email on file — copy the link below.
                </div>
              )}
            </div>

            {/* Copyable URL */}
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Portal URL (expires in 1 hour)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                readOnly
                value={modal.url}
                style={{ ...inputStyle, flex: 1, fontSize: 11, color: C.muted, background: C.bg }}
              />
              <button
                onClick={() => navigator.clipboard.writeText(modal.url).then(() => showToast('Copied!'))}
                style={btnStyle(C.primary)}
              >
                Copy
              </button>
              <a href={modal.url} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle('#475569'), textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                Open ↗
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={btnStyle(C.primary)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Billing</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Manage Stripe subscriptions across all agent sites.</p>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200 }}>
        {/* MRR summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Monthly Recurring Revenue', value: mrrFormatted, color: C.primary },
            { label: 'Active Subscriptions', value: String(activeCount), color: C.success },
            { label: 'Past Due', value: String(pastDueCount), color: pastDueCount > 0 ? C.warning : C.muted },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color }}>{loading ? '…' : value}</div>
            </div>
          ))}
        </div>

        {/* Filters + table */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, flex: 1 }}>All Agents</div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, background: C.white, fontFamily: 'inherit' }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="cancelling">Cancelling</option>
              <option value="suspended">Suspended</option>
              <option value="canceled">Canceled</option>
              <option value="none">No subscription</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.muted }}>Loading…</div>
          ) : agents.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.muted }}>No agents found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Agent', 'Domain', 'Tier', 'Status', 'Next Payment', 'Last Paid', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, i) => {
                    const busy = actionState[a.id]
                    return (
                      <tr key={a.id} style={{ borderBottom: i < agents.length - 1 ? `1px solid ${C.border}` : 'none', background: a.billing_status === 'past_due' ? '#fffbeb' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>
                          {a.name}
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>#{a.id} · {a.slug}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>
                          {a.custom_domain ? (
                            <a href={`https://${a.custom_domain}`} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontSize: 12 }}>{a.custom_domain} ↗</a>
                          ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 12 }}>{tierLabel(a.billing_tier)}</td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{statusBadge(a.billing_status)}</td>
                        <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {a.next_billing_date ? new Date(a.next_billing_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {a.last_payment_at ? new Date(a.last_payment_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {/* Create subscription */}
                            {!a.stripe_subscription_id && (
                              <button
                                onClick={() => { setCreateForm({ tier: 'personal', email: a.notification_email ?? '', start_date: new Date().toISOString().slice(0, 10) }); setCreateError(''); setModal({ kind: 'create', agent: a }) }}
                                style={btnStyle(C.primary)}
                              >
                                + Subscribe
                              </button>
                            )}
                            {/* Email Portal Link */}
                            {a.stripe_customer_id && (
                              <button
                                onClick={() => emailPortalLink(a)}
                                disabled={busy === 'portal'}
                                style={btnStyle('#7c3aed', '#fff', busy === 'portal')}
                              >
                                {busy === 'portal' ? '…' : 'Email Portal Link'}
                              </button>
                            )}
                            {/* One-time charge */}
                            {a.stripe_customer_id && (
                              <button
                                onClick={() => { setChargeForm({ amount: '', description: '' }); setChargeError(''); setModal({ kind: 'charge', agent: a }) }}
                                style={btnStyle('#0891b2')}
                              >
                                $ Charge
                              </button>
                            )}
                            {/* Cancel */}
                            {a.stripe_subscription_id && a.billing_status !== 'cancelling' && (
                              <button
                                onClick={() => { if (confirm(`Cancel ${a.name}'s subscription at period end?`)) doAction(a.id, 'subscription', 'DELETE') }}
                                disabled={busy === 'loading'}
                                style={btnStyle(C.warning, '#fff', busy === 'loading')}
                              >
                                Cancel
                              </button>
                            )}
                            {/* Suspend / Reactivate */}
                            {a.billing_status !== 'suspended' ? (
                              <button
                                onClick={() => { if (confirm(`Manually suspend ${a.name}?`)) doAction(a.id, 'suspend') }}
                                disabled={busy === 'loading'}
                                style={btnStyle(C.danger, '#fff', busy === 'loading')}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => { if (confirm(`Reactivate ${a.name}?`)) doAction(a.id, 'reactivate') }}
                                disabled={busy === 'loading'}
                                style={btnStyle(C.success, '#fff', busy === 'loading')}
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tier reference cards */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { key: 'hub', label: 'Area Hub', amount: '$2,500/mo', desc: 'Regional market hub with co-agent support, full neighbourhood content, and unlimited territories.' },
            { key: 'personal', label: 'Personal Site', amount: '$150/mo', desc: 'Single-agent branded site with AI content, market stats, and lead capture.' },
          ].map(t => (
            <div key={t.key} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{t.label}</div>
                <div style={{ fontWeight: 900, fontSize: 15, color: C.primary }}>{t.amount}</div>
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
