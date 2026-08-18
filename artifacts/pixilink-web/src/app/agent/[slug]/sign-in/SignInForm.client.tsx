'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { nextStepPath, peekReturnTo, parseSourceContext } from '@/lib/auth-client'
import { clientAgentPrefix } from '@/lib/api'

const AERIAL_PHOTO =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80'

type Tab = 'login' | 'register'

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

function SignInInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const agentPrefix = clientAgentPrefix(slug)
  const ap = (p: string) => `${agentPrefix}${p}`
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicEmail, setMagicEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCountryCode, setRegCountryCode] = useState('+1')

  const loginEmail = useRef<HTMLInputElement>(null)

  const regFirstName = useRef<HTMLInputElement>(null)
  const regLastName = useRef<HTMLInputElement>(null)
  const regEmail = useRef<HTMLInputElement>(null)
  const regTerms = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const prefill = searchParams.get('email')
    if (prefill && loginEmail.current) loginEmail.current.value = decodeURIComponent(prefill)
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const email = loginEmail.current?.value || ''
    setLoading(true)
    try {
      const returnTo = searchParams.get('return_to') || searchParams.get('return') || ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/auth/send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, agent_slug: slug, return_to: returnTo }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      setMagicEmail(email)
      setMagicSent(true)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function regDialCode(v: string) { return v === '+1_US' ? '+1' : v }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!regTerms.current?.checked) { setError('You must agree to the terms to continue.'); return }
    const phoneDigitsEarly = regPhone.replace(/\D/g, '')
    if (phoneDigitsEarly.length < 7) { setError('Please enter a valid phone number.'); return }
    setLoading(true)
    try {
      const sourceCtx = parseSourceContext(peekReturnTo())
      const phoneDigits = regPhone.replace(/\D/g, '')
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:  regFirstName.current?.value?.trim() || '',
          last_name:   regLastName.current?.value?.trim() || '',
          email:       regEmail.current?.value,
          terms:       '1',
          agent_slug:  slug,
          phone: phoneDigits, phone_country_code: regDialCode(regCountryCode),
          ...sourceCtx,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(getErrorMsg(data)); return }
      router.push(nextStepPath(slug, data.next_step, agentPrefix))
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @media (max-width: 680px) {
          .signin-benefits { display: none !important; }
          .signin-mobile-hero { display: block !important; }
          .signin-name-row { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 681px) {
          .signin-mobile-hero { display: none !important; }
        }
        .tab-register-active {
          background: var(--primary-bg) !important;
          color: #fff !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18) !important;
        }
        .tab-register-inactive {
          background: transparent !important;
          color: #6b7280 !important;
        }
        .tab-login-active {
          background: var(--primary-bg) !important;
          color: #fff !important;
        }
        .tab-login-inactive {
          background: transparent !important;
          color: #6b7280 !important;
        }
      `}</style>

      {/* Mobile hero strip */}
      <div className="signin-mobile-hero" style={{ display: 'none' }}>
        <div style={{
          position: 'relative', height: 160,
          background: `url(${AERIAL_PHOTO}) center/cover no-repeat`,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(14,29,50,0.72), rgba(14,29,50,0.92))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', padding: '0 24px',
          }}>
            <h2 style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: 21, fontWeight: 700, color: '#fff', margin: '0 0 8px', textAlign: 'center',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>
              Your neighbours are watching the market.
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', margin: 0, textAlign: 'center' }}>
              See what every home around you actually sold&nbsp;for.
            </p>
          </div>
          {/* Member count badge */}
          <div style={{
            position: 'absolute', bottom: 12, right: 14,
            background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(4px)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.90)',
            letterSpacing: 0.2,
          }}>
            2,400+ members
          </div>
        </div>
      </div>

      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 960, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'stretch', justifyContent: 'center' }}>

          {/* ── Benefits panel ── */}
          <aside className="signin-benefits" style={{
            flex: '1 1 320px', minWidth: 280, maxWidth: 420,
            borderRadius: 14, overflow: 'hidden',
            position: 'relative',
            background: `url(${AERIAL_PHOTO}) center/cover no-repeat`,
            minHeight: 460,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, rgba(14,29,50,0.80) 0%, rgba(10,22,40,0.93) 100%)',
            }} />
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '44px 36px', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', height: '100%', boxSizing: 'border-box',
            }}>
              <div style={{
                display: 'inline-block', background: 'var(--brand-accent)',
                color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
                padding: '3px 10px', borderRadius: 20, marginBottom: 16,
                textTransform: 'uppercase', width: 'fit-content',
              }}>
                Free Access
              </div>
              <h2 style={{
                fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: 'clamp(20px,2.2vw,26px)', fontWeight: 700,
                lineHeight: 1.25, margin: '0 0 10px', color: '#fff',
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}>
                Your neighbours are watching the market. Are&nbsp;you?
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', margin: '0 0 6px' }}>
                Join <strong style={{ color: '#fff' }}>2,400+ buyers</strong> already tracking the local market — sign up in seconds, no passwords, no&nbsp;spam.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16, margin: '20px 0 0', padding: 0 }}>
                {BENEFITS.map(b => (
                  <li key={b.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.14)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                    }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>{b.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5, marginTop: 2 }}>{b.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Auth column ── */}
          <div style={{ flex: '1 1 360px', minWidth: 300, maxWidth: 440 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, marginBottom: 20 }}>
              {(['register', 'login'] as Tab[]).map(t => {
                const isActive = tab === t
                const isRegister = t === 'register'
                return (
                  <button key={t} onClick={() => { setTab(t); setError(''); setMagicSent(false) }}
                    style={{
                      flex: 1, padding: '10px 0', border: 'none', borderRadius: 8,
                      fontWeight: isActive && isRegister ? 700 : 600,
                      fontSize: 14,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: isActive ? 'var(--primary-bg)' : 'transparent',
                      color: isActive ? '#fff' : '#6b7280',
                      boxShadow: isActive && isRegister ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                      position: 'relative',
                    }}>
                    {t === 'login' ? 'Sign In' : (
                      <>
                        Create Account
                        {!isActive && (
                          <span style={{
                            marginLeft: 6,
                            background: 'var(--brand-accent, #c9a84c)',
                            color: '#fff',
                            fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                            padding: '1px 5px', borderRadius: 8,
                            verticalAlign: 'middle',
                            textTransform: 'uppercase',
                          }}>
                            New?
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Card */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '32px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', border: '1px solid #ececec' }}>
              {error && (
                <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: '#c0392b', fontSize: 13 }}>
                  {error}
                </div>
              )}

              {tab === 'login' ? (
                magicSent ? (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Check your inbox</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 6px' }}>We sent a sign-in link to</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>{magicEmail}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
                      Expires in 15 minutes. Check spam if you don&apos;t see it.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                        Enter your email and we&apos;ll send you a secure sign-in link — no password needed.
                      </p>
                      <label style={labelStyle}>Email Address</label>
                      <input ref={loginEmail} type="email" required autoComplete="email" placeholder="you@example.com" style={inputStyle} />
                    </div>
                    <button type="submit" disabled={loading} style={btnStyle(loading)}>
                      {loading ? 'Sending…' : 'Send Sign-In Link →'}
                    </button>
                    <TrustStrip />
                  </form>
                )
              ) : (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="signin-name-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>First Name</label>
                      <input ref={regFirstName} required autoComplete="given-name" placeholder="Jane" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name</label>
                      <input ref={regLastName} required autoComplete="family-name" placeholder="Doe" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input ref={regEmail} type="email" required autoComplete="email" placeholder="you@example.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Phone
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={regCountryCode} onChange={e => setRegCountryCode(e.target.value)}
                        style={{ ...inputStyle, width: 'auto', minWidth: 110, flexShrink: 0 }}>
                        <option value="+1">🇨🇦 +1</option>
                        <option value="+1_US">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+">Other</option>
                      </select>
                      <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                        placeholder="604-555-1234" autoComplete="tel-national"
                        style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                    <input ref={regTerms} type="checkbox" style={{ marginTop: 3, flexShrink: 0 }} />
                    I agree to the <a href={ap('/terms')} target="_blank" style={{ color: 'var(--accent)' }}>terms of service</a> and&nbsp;
                    <a href={ap('/privacy')} target="_blank" style={{ color: 'var(--accent)' }}>privacy policy</a>.
                  </label>
                  <button type="submit" disabled={loading} style={btnStyle(loading)}>
                    {loading ? 'Creating account…' : 'Create Free Account →'}
                  </button>
                  <TrustStrip />
                </form>
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>
              {tab === 'register'
                ? <>Already have an account?{' '}
                    <button onClick={() => { setTab('login'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>Sign in</button>
                  </>
                : <>New here?{' '}
                    <button onClick={() => { setTab('register'); setError(''); setMagicSent(false) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>Create a free account</button>
                  </>
              }
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function TrustStrip() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, marginTop: 2,
    }}>
      {['Free forever', 'No passwords', 'No spam'].map((item, i) => (
        <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#d1d5db', fontSize: 11 }}>·</span>}
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{item}</span>
        </span>
      ))}
    </div>
  )
}

export default function SignInForm() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#444', letterSpacing: 0.3, marginBottom: 6, display: 'block' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e0ddd8', borderRadius: 7,
  fontSize: 14, color: '#1a1a1a', background: '#faf9f7', outline: 'none', boxSizing: 'border-box',
}
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? '#ccc' : 'var(--cta-primary)',
  color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '12px 0',
  fontWeight: 700, fontSize: 15, cursor: disabled ? 'not-allowed' : 'pointer',
  width: '100%', letterSpacing: 0.3, transition: 'opacity 0.15s',
  opacity: disabled ? 0.7 : 1,
})

const BENEFITS: { title: string; desc: string }[] = [
  {
    title: 'See exactly what your neighbour\'s home sold for',
    desc: 'Full sold prices — down to the dollar — for every recent sale nearby.',
  },
  {
    title: 'Track every listing you love in one place',
    desc: 'Save favourites and come back to them anytime, on any device.',
  },
  {
    title: 'Get alerted the moment prices drop or new homes list',
    desc: 'Be first to know — before the open house, before the crowd.',
  },
  {
    title: 'Book a private showing in seconds',
    desc: 'Request a tour of any listing directly through the site — no phone tag.',
  },
]
