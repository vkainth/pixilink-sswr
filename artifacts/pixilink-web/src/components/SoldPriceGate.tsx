'use client'

import { useParams } from 'next/navigation'

interface Props {
  price: string
  label?: string
  agentPrefix?: string
}

export default function SoldPriceGate({ price, label = 'Sold Price', agentPrefix }: Props) {
  const params = useParams()
  const slug = params?.slug as string || ''
  const prefix = agentPrefix ?? `/agent/${slug}`

  function handleRegister() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pxl_return_to', window.location.pathname + window.location.search)
    }
    window.location.href = `${prefix}/register`
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
        {price}
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <button
          onClick={handleRegister}
          style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 6, padding: '5px 14px', fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 0.2 }}>
          View {label}
        </button>
      </div>
    </div>
  )
}

interface SoldPriceGateCardProps {
  isLoggedIn: boolean
  slug: string
  agentPrefix?: string
  /**
   * Gated figures — pass null unless isLoggedIn. This is a CLIENT component, so any
   * number handed in is serialised into the RSC payload and readable in page source
   * regardless of the blur drawn over it. A CSS blur is a picture of a lock, not a lock.
   */
  soldPrice: number | null
  listPrice: number | null
  soldDate: string | null
  dom: number | null
  subarea: string | null
  city: string
  soldRatio: string | null
  nextStepUrl?: string
}

export function SoldPriceGateCard({
  isLoggedIn,
  slug,
  agentPrefix,
  soldPrice,
  listPrice,
  soldDate,
  dom,
  subarea,
  city,
  soldRatio,
  nextStepUrl,
}: SoldPriceGateCardProps) {
  const area = subarea || city
  const prefix = agentPrefix ?? `/agent/${slug}`

  function nav(dest: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pxl_return_to', window.location.pathname + window.location.search)
    }
    window.location.href = `${prefix}/${dest}`
  }

  const priceFmt = soldPrice != null
    ? `$${Math.round(soldPrice).toLocaleString('en-CA')}`
    : '$000,000'

  const soldDateLabel = (() => {
    if (!soldDate) return null
    const d = new Date(soldDate)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  })()

  if (isLoggedIn && soldPrice != null) {
    const ratioNum = soldRatio ? Number(soldRatio) : null
    const priceDelta = soldPrice - (listPrice ?? soldPrice)
    const deltaFmt = `${priceDelta >= 0 ? '+' : ''}$${Math.abs(Math.round(priceDelta)).toLocaleString('en-CA')}`

    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '24px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#15803d', marginBottom: 6 }}>Sold Price Unlocked</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--accent)', letterSpacing: -1, marginBottom: 10 }}>{priceFmt}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#374151' }}>
          {soldDateLabel && <span>Sold {soldDateLabel}</span>}
          {dom != null && <span>· {dom} day{dom === 1 ? '' : 's'} on market</span>}
          {soldRatio && (
            <span style={{ color: ratioNum != null && ratioNum >= 100 ? '#15803d' : '#374151' }}>
              · {soldRatio}% of asking ({deltaFmt})
            </span>
          )}
        </div>
      </div>
    )
  }

  if (nextStepUrl) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 10 }}>This home sold for</div>
        <div style={{
          fontSize: 48, fontWeight: 900, color: 'var(--text)', letterSpacing: -1,
          filter: 'blur(8px)', userSelect: 'none', marginBottom: 28,
        }}>
          {priceFmt}
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>One more step</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
            You&apos;re almost there! Complete your registration to unlock the full sold price and all sold data in {area}.
          </div>
          <a
            href={nextStepUrl}
            style={{ display: 'block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15, textDecoration: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 16 }}>
            Complete your registration →
          </a>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Join <strong style={{ color: 'var(--text)' }}>4,800+</strong> buyers already using {area}&apos;s most complete sold data
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 10 }}>This home sold for</div>
      <div style={{
        fontSize: 48, fontWeight: 900, color: 'var(--text)', letterSpacing: -1,
        filter: 'blur(8px)', userSelect: 'none', marginBottom: 28,
      }}>
        {priceFmt}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Unlock the Sold Price</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
          Sign in free to access the full sold price, view all sold listings in {area}, and get real market data to make better buying or selling decisions.
        </div>

        <button
          onClick={() => nav('register')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', padding: '14px 28px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%', marginBottom: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 900 }}>G</span> Continue with Google
        </button>

        <button
          onClick={() => nav('login')}
          style={{ width: '100%', background: 'var(--off-white)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          Sign in with email or phone
        </button>

        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'left', lineHeight: 1.5 }}>
            I agree to the <a href={`${prefix}/terms`} style={{ color: 'var(--accent)' }}>Terms &amp; Conditions</a> and consent to receive market updates.
          </span>
        </label>

        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Join <strong style={{ color: 'var(--text)' }}>4,800+</strong> buyers already using {area}&apos;s most complete sold data
        </div>
      </div>
    </div>
  )
}

/**
 * Inline gate banner used below sold comparable tables.
 */
export function SoldPriceBanner({ city, slug, agentPrefix, nextStepUrl }: { city: string; slug: string; agentPrefix?: string; nextStepUrl?: string }) {
  const prefix = agentPrefix ?? `/agent/${slug}`
  function handleClick(dest: 'register' | 'login') {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pxl_return_to', window.location.pathname + window.location.search)
    }
    window.location.href = `${prefix}/${dest}`
  }

  if (nextStepUrl) {
    return (
      <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 20px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            Complete your registration to see sold prices in {city}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            You&apos;re almost done — takes under a minute
          </div>
        </div>
        <a
          href={nextStepUrl}
          style={{ background: 'var(--primary-bg)', color: '#fff', borderRadius: 6, padding: '8px 18px', fontWeight: 700, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Complete registration →
        </a>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 20px', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          See sold prices in {city}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Free account — takes under 3 minutes
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => handleClick('login')}
          style={{ background: 'var(--primary-bg)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
          Sign in
        </button>
        <button onClick={() => handleClick('register')}
          style={{ background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          Create free account
        </button>
      </div>
    </div>
  )
}
