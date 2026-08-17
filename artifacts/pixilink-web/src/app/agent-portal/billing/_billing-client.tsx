'use client'

import { useState } from 'react'
import type { AgentPortalBillingStatus } from '@/lib/agent-portal-api'

const P = {
  primary: '#23a9e1', bg: '#f1f5f9', white: '#ffffff', text: '#1e293b',
  muted: '#64748b', border: '#e2e8f0', sidebarBg: '#0f172a',
}

interface Props {
  billing: AgentPortalBillingStatus | null
  agentName: string
}

function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:     { bg: '#f0fdf4', color: '#166534', label: '✓ Active' },
    past_due:   { bg: '#fffbeb', color: '#92400e', label: '⚠ Payment Past Due' },
    cancelling: { bg: '#eff6ff', color: '#1d4ed8', label: '↩ Cancels at Period End' },
    suspended:  { bg: '#fef2f2', color: '#991b1b', label: '✕ Suspended' },
    canceled:   { bg: '#f8fafc', color: '#64748b', label: '— Canceled' },
    none:       { bg: '#f8fafc', color: '#94a3b8', label: '· No active subscription' },
  }
  const b = map[s] ?? map.none
  return (
    <span style={{ background: b.bg, color: b.color, fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20 }}>
      {b.label}
    </span>
  )
}

function invoiceStatusBadge(s: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid:           { bg: '#f0fdf4', color: '#166534', label: '✓ Paid' },
    open:           { bg: '#fffbeb', color: '#92400e', label: '⏳ Open' },
    void:           { bg: '#f8fafc', color: '#64748b', label: '— Void' },
    draft:          { bg: '#f1f5f9', color: '#64748b', label: '· Draft' },
    uncollectible:  { bg: '#fef2f2', color: '#991b1b', label: '✕ Uncollectible' },
  }
  const b = map[s] ?? { bg: '#f8fafc', color: '#94a3b8', label: s }
  return (
    <span style={{ background: b.bg, color: b.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 16, whiteSpace: 'nowrap' }}>
      {b.label}
    </span>
  )
}

function pmBrandLabel(brand: string | null): string {
  if (!brand) return 'Card'
  const labels: Record<string, string> = {
    visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex',
    discover: 'Discover', jcb: 'JCB', unionpay: 'UnionPay',
    diners: 'Diners', unknown: 'Card',
  }
  return labels[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1)
}

export default function AgentBillingClient({ billing, agentName }: Props) {
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')

  async function openBillingPortal() {
    setPortalLoading(true)
    setPortalError('')
    try {
      const res = await fetch('/api/agent-portal/billing-portal', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        setPortalError(json.error || 'Could not open billing portal. Contact support.')
      }
    } catch {
      setPortalError('Network error. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const hasSub     = billing && billing.billing_status !== 'none' && billing.billing_tier
  const isPastDue  = billing?.billing_status === 'past_due'
  const isSuspended = billing?.billing_status === 'suspended'
  // Gate portal access on having a Stripe customer (not just a saved card),
  // so agents can open the portal to ADD their card after an incomplete subscription is created.
  const hasPortal  = billing?.has_stripe_customer

  const pmDisplay = billing?.payment_method_last4
    ? `${pmBrandLabel(billing.payment_method_brand ?? null)} ·· ${billing.payment_method_last4}`
    : null

  return (
    <>
      <div style={{ padding: '28px 32px 20px', borderBottom: `1px solid ${P.border}`, background: P.white }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Billing & Subscription</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: P.muted }}>Manage your Pixilink plan and view payment history.</p>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 860 }}>

        {/* Past-due / suspended alert */}
        {(isPastDue || isSuspended) && (
          <div style={{
            background: isSuspended ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${isSuspended ? '#fecaca' : '#fde68a'}`,
            borderRadius: 12, padding: '16px 22px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: isSuspended ? '#991b1b' : '#92400e', marginBottom: 4 }}>
                {isSuspended ? '⛔ Site suspended due to unpaid invoice' : '⚠ Payment overdue'}
              </div>
              <div style={{ fontSize: 13, color: isSuspended ? '#7f1d1d' : '#78350f' }}>
                {isSuspended
                  ? 'Your site is currently offline. Update your payment method to restore access.'
                  : 'Please update your payment method to avoid suspension.'}
              </div>
            </div>
            {hasPortal && (
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: isSuspended ? '#991b1b' : '#b45309', color: '#fff', fontSize: 13, fontWeight: 700, cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                {portalLoading ? 'Loading…' : 'Update Payment →'}
              </button>
            )}
          </div>
        )}

        {/* Current plan card */}
        <div style={{ background: P.white, borderRadius: 14, border: `1px solid ${P.border}`, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '20px 26px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Your Plan</div>
              {hasSub ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: P.text }}>{billing.billing_tier_label}</div>
                    {statusBadge(billing.billing_status)}
                  </div>
                  <div style={{ fontSize: 13, color: P.muted, marginTop: 4 }}>
                    {billing.billing_tier_amount}
                    {billing.next_billing_date && billing.billing_status === 'active' && (
                      <> · Next payment <strong style={{ color: P.text }}>{new Date(billing.next_billing_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></>
                    )}
                    {billing.billing_status === 'cancelling' && billing.next_billing_date && (
                      <> · Active until <strong style={{ color: P.text }}>{new Date(billing.next_billing_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.muted }}>No active subscription</div>
                  <div style={{ fontSize: 13, color: P.muted, marginTop: 4 }}>Contact your Pixilink account manager to get started.</div>
                </>
              )}

              {/* Payment method on file */}
              {pmDisplay && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>💳</span>
                  <span style={{ fontSize: 13, color: P.muted }}>
                    {pmDisplay} on file
                  </span>
                </div>
              )}
            </div>

            {hasPortal && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {portalError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{portalError}</div>}
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  style={{
                    padding: '10px 20px', borderRadius: 9, border: 'none', background: P.primary, color: '#fff',
                    fontSize: 13, fontWeight: 700, cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {portalLoading ? 'Loading…' : 'Manage Billing ↗'}
                </button>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 4 }}>Update card · download invoices</div>
              </div>
            )}
          </div>

          {/* What's included */}
          {hasSub && billing.billing_status !== 'canceled' && (
            <div style={{ padding: '16px 26px', background: P.bg, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {(billing.billing_tier === 'hub'
                ? ['Dual-agent / area hub', 'Neighbourhood content', 'Market stats & reports', 'AI-generated copy', 'Unlimited territories']
                : ['Branded agent site', 'Market stats & reports', 'AI-generated copy', 'Lead capture', 'Custom domain']
              ).map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: P.text }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact callout */}
        <div style={{ background: `linear-gradient(135deg, ${P.sidebarBg} 0%, #1e3a5f 100%)`, borderRadius: 14, padding: '22px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: P.primary, fontWeight: 700, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Questions or changes?</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Talk to your Pixilink account manager</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Upgrade plan · adjust billing · custom arrangements</div>
          </div>
          <a
            href="mailto:support@pixilink.ca"
            style={{ background: P.primary, color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', textDecoration: 'none' }}
          >
            Contact Us →
          </a>
        </div>

        {/* Invoice history — all statuses */}
        {billing && billing.invoices.length > 0 && (
          <div style={{ background: P.white, borderRadius: 14, border: `1px solid ${P.border}`, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ padding: '18px 26px 14px', borderBottom: `1px solid ${P.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: P.text }}>Invoice History</div>
              <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>All invoices — paid, open, and voided</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: P.bg }}>
                    {['Date', 'Description', 'Amount', 'Status', 'Receipt'].map(h => (
                      <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: P.muted, borderBottom: `1px solid ${P.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {billing.invoices.map((inv, i) => (
                    <tr key={inv.id} style={{ borderBottom: i < billing.invoices.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: P.text, whiteSpace: 'nowrap' }}>{inv.date}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: P.muted }}>{inv.description}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: P.text, whiteSpace: 'nowrap' }}>{inv.amount}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {invoiceStatusBadge(inv.status)}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {inv.invoice_pdf ? (
                          <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: P.primary }}>PDF ↗</a>
                        ) : inv.hosted_url ? (
                          <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: P.primary }}>View ↗</a>
                        ) : (
                          <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No invoices yet */}
        {billing && billing.invoices.length === 0 && hasSub && (
          <div style={{ background: P.white, borderRadius: 14, border: `1px solid ${P.border}`, padding: '28px', marginBottom: 20, textAlign: 'center', color: P.muted, fontSize: 13 }}>
            No invoices yet. They will appear here once your first payment is processed.
          </div>
        )}

        {/* Help note */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 22px', fontSize: 13, color: '#78350f' }}>
          <strong>Questions about your bill?</strong> Contact your Pixilink account manager at{' '}
          <a href="mailto:support@pixilink.ca" style={{ color: '#92400e' }}>support@pixilink.ca</a>.
          {hasPortal && (
            <> You can also{' '}
              <button
                onClick={openBillingPortal}
                style={{ background: 'none', border: 'none', color: '#92400e', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
              >
                open your billing portal
              </button>
              {' '}to manage your payment method and download all invoices directly.
            </>
          )}
        </div>
      </div>
    </>
  )
}
