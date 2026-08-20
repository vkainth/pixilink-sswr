'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-client'
import AuthSplitLayout from '@/components/AuthSplitLayout'
import type { AgentProfile } from '@/lib/types'

// Three steps, not two: a passwordless registration always continues to the MLS VOW
// terms screen (board compliance - CADREB/FVREB/REBGV), so the count must include it.
// Previously this showed 2 dots here and 3 on the terms page, so the indicator grew
// a dot at the end and the label promised "Step 2 of 2" before a third screen.
const STEPS = [
  { state: 'done' as const },
  { state: 'active' as const },
  { state: 'inactive' as const },
]

type CountryEntry = { label: string; value: string; disabled?: boolean }

const COUNTRY_CODES: CountryEntry[] = [
  // Canada & US first
  { label: '🇨🇦 Canada (+1)', value: '+1_CA' },
  { label: '🇺🇸 United States (+1)', value: '+1_US' },
  { label: '──────────', value: '', disabled: true },
  // Rest of world A–Z
  { label: '🇦🇫 Afghanistan (+93)', value: '+93' },
  { label: '🇦🇱 Albania (+355)', value: '+355' },
  { label: '🇩🇿 Algeria (+213)', value: '+213' },
  { label: '🇦🇩 Andorra (+376)', value: '+376' },
  { label: '🇦🇴 Angola (+244)', value: '+244' },
  { label: '🇦🇷 Argentina (+54)', value: '+54' },
  { label: '🇦🇲 Armenia (+374)', value: '+374' },
  { label: '🇦🇺 Australia (+61)', value: '+61' },
  { label: '🇦🇹 Austria (+43)', value: '+43' },
  { label: '🇦🇿 Azerbaijan (+994)', value: '+994' },
  { label: '🇧🇸 Bahamas (+1-242)', value: '+1242' },
  { label: '🇧🇭 Bahrain (+973)', value: '+973' },
  { label: '🇧🇩 Bangladesh (+880)', value: '+880' },
  { label: '🇧🇧 Barbados (+1-246)', value: '+1246' },
  { label: '🇧🇾 Belarus (+375)', value: '+375' },
  { label: '🇧🇪 Belgium (+32)', value: '+32' },
  { label: '🇧🇿 Belize (+501)', value: '+501' },
  { label: '🇧🇯 Benin (+229)', value: '+229' },
  { label: '🇧🇹 Bhutan (+975)', value: '+975' },
  { label: '🇧🇴 Bolivia (+591)', value: '+591' },
  { label: '🇧🇦 Bosnia & Herzegovina (+387)', value: '+387' },
  { label: '🇧🇼 Botswana (+267)', value: '+267' },
  { label: '🇧🇷 Brazil (+55)', value: '+55' },
  { label: '🇧🇳 Brunei (+673)', value: '+673' },
  { label: '🇧🇬 Bulgaria (+359)', value: '+359' },
  { label: '🇧🇫 Burkina Faso (+226)', value: '+226' },
  { label: '🇧🇮 Burundi (+257)', value: '+257' },
  { label: '🇰🇭 Cambodia (+855)', value: '+855' },
  { label: '🇨🇲 Cameroon (+237)', value: '+237' },
  { label: '🇨🇻 Cape Verde (+238)', value: '+238' },
  { label: '🇨🇫 Central African Republic (+236)', value: '+236' },
  { label: '🇹🇩 Chad (+235)', value: '+235' },
  { label: '🇨🇱 Chile (+56)', value: '+56' },
  { label: '🇨🇳 China (+86)', value: '+86' },
  { label: '🇨🇴 Colombia (+57)', value: '+57' },
  { label: '🇰🇲 Comoros (+269)', value: '+269' },
  { label: '🇨🇩 Congo, DRC (+243)', value: '+243' },
  { label: '🇨🇬 Congo, Republic (+242)', value: '+242' },
  { label: '🇨🇷 Costa Rica (+506)', value: '+506' },
  { label: '🇨🇮 Côte d\'Ivoire (+225)', value: '+225' },
  { label: '🇭🇷 Croatia (+385)', value: '+385' },
  { label: '🇨🇺 Cuba (+53)', value: '+53' },
  { label: '🇨🇾 Cyprus (+357)', value: '+357' },
  { label: '🇨🇿 Czech Republic (+420)', value: '+420' },
  { label: '🇩🇰 Denmark (+45)', value: '+45' },
  { label: '🇩🇯 Djibouti (+253)', value: '+253' },
  { label: '🇩🇴 Dominican Republic (+1-809)', value: '+1809' },
  { label: '🇪🇨 Ecuador (+593)', value: '+593' },
  { label: '🇪🇬 Egypt (+20)', value: '+20' },
  { label: '🇸🇻 El Salvador (+503)', value: '+503' },
  { label: '🇬🇶 Equatorial Guinea (+240)', value: '+240' },
  { label: '🇪🇷 Eritrea (+291)', value: '+291' },
  { label: '🇪🇪 Estonia (+372)', value: '+372' },
  { label: '🇸🇿 Eswatini (+268)', value: '+268' },
  { label: '🇪🇹 Ethiopia (+251)', value: '+251' },
  { label: '🇫🇯 Fiji (+679)', value: '+679' },
  { label: '🇫🇮 Finland (+358)', value: '+358' },
  { label: '🇫🇷 France (+33)', value: '+33' },
  { label: '🇬🇦 Gabon (+241)', value: '+241' },
  { label: '🇬🇲 Gambia (+220)', value: '+220' },
  { label: '🇬🇪 Georgia (+995)', value: '+995' },
  { label: '🇩🇪 Germany (+49)', value: '+49' },
  { label: '🇬🇭 Ghana (+233)', value: '+233' },
  { label: '🇬🇷 Greece (+30)', value: '+30' },
  { label: '🇬🇹 Guatemala (+502)', value: '+502' },
  { label: '🇬🇳 Guinea (+224)', value: '+224' },
  { label: '🇬🇼 Guinea-Bissau (+245)', value: '+245' },
  { label: '🇬🇾 Guyana (+592)', value: '+592' },
  { label: '🇭🇹 Haiti (+509)', value: '+509' },
  { label: '🇭🇳 Honduras (+504)', value: '+504' },
  { label: '🇭🇰 Hong Kong (+852)', value: '+852' },
  { label: '🇭🇺 Hungary (+36)', value: '+36' },
  { label: '🇮🇸 Iceland (+354)', value: '+354' },
  { label: '🇮🇳 India (+91)', value: '+91' },
  { label: '🇮🇩 Indonesia (+62)', value: '+62' },
  { label: '🇮🇷 Iran (+98)', value: '+98' },
  { label: '🇮🇶 Iraq (+964)', value: '+964' },
  { label: '🇮🇪 Ireland (+353)', value: '+353' },
  { label: '🇮🇱 Israel (+972)', value: '+972' },
  { label: '🇮🇹 Italy (+39)', value: '+39' },
  { label: '🇯🇲 Jamaica (+1-876)', value: '+1876' },
  { label: '🇯🇵 Japan (+81)', value: '+81' },
  { label: '🇯🇴 Jordan (+962)', value: '+962' },
  { label: '🇰🇿 Kazakhstan (+7)', value: '+7' },
  { label: '🇰🇪 Kenya (+254)', value: '+254' },
  { label: '🇰🇼 Kuwait (+965)', value: '+965' },
  { label: '🇰🇬 Kyrgyzstan (+996)', value: '+996' },
  { label: '🇱🇦 Laos (+856)', value: '+856' },
  { label: '🇱🇻 Latvia (+371)', value: '+371' },
  { label: '🇱🇧 Lebanon (+961)', value: '+961' },
  { label: '🇱🇸 Lesotho (+266)', value: '+266' },
  { label: '🇱🇷 Liberia (+231)', value: '+231' },
  { label: '🇱🇾 Libya (+218)', value: '+218' },
  { label: '🇱🇮 Liechtenstein (+423)', value: '+423' },
  { label: '🇱🇹 Lithuania (+370)', value: '+370' },
  { label: '🇱🇺 Luxembourg (+352)', value: '+352' },
  { label: '🇲🇴 Macau (+853)', value: '+853' },
  { label: '🇲🇬 Madagascar (+261)', value: '+261' },
  { label: '🇲🇼 Malawi (+265)', value: '+265' },
  { label: '🇲🇾 Malaysia (+60)', value: '+60' },
  { label: '🇲🇻 Maldives (+960)', value: '+960' },
  { label: '🇲🇱 Mali (+223)', value: '+223' },
  { label: '🇲🇹 Malta (+356)', value: '+356' },
  { label: '🇲🇷 Mauritania (+222)', value: '+222' },
  { label: '🇲🇺 Mauritius (+230)', value: '+230' },
  { label: '🇲🇽 Mexico (+52)', value: '+52' },
  { label: '🇫🇲 Micronesia (+691)', value: '+691' },
  { label: '🇲🇩 Moldova (+373)', value: '+373' },
  { label: '🇲🇨 Monaco (+377)', value: '+377' },
  { label: '🇲🇳 Mongolia (+976)', value: '+976' },
  { label: '🇲🇪 Montenegro (+382)', value: '+382' },
  { label: '🇲🇦 Morocco (+212)', value: '+212' },
  { label: '🇲🇿 Mozambique (+258)', value: '+258' },
  { label: '🇲🇲 Myanmar (+95)', value: '+95' },
  { label: '🇳🇦 Namibia (+264)', value: '+264' },
  { label: '🇳🇵 Nepal (+977)', value: '+977' },
  { label: '🇳🇱 Netherlands (+31)', value: '+31' },
  { label: '🇳🇿 New Zealand (+64)', value: '+64' },
  { label: '🇳🇮 Nicaragua (+505)', value: '+505' },
  { label: '🇳🇪 Niger (+227)', value: '+227' },
  { label: '🇳🇬 Nigeria (+234)', value: '+234' },
  { label: '🇲🇰 North Macedonia (+389)', value: '+389' },
  { label: '🇳🇴 Norway (+47)', value: '+47' },
  { label: '🇴🇲 Oman (+968)', value: '+968' },
  { label: '🇵🇰 Pakistan (+92)', value: '+92' },
  { label: '🇵🇼 Palau (+680)', value: '+680' },
  { label: '🇵🇦 Panama (+507)', value: '+507' },
  { label: '🇵🇬 Papua New Guinea (+675)', value: '+675' },
  { label: '🇵🇾 Paraguay (+595)', value: '+595' },
  { label: '🇵🇪 Peru (+51)', value: '+51' },
  { label: '🇵🇭 Philippines (+63)', value: '+63' },
  { label: '🇵🇱 Poland (+48)', value: '+48' },
  { label: '🇵🇹 Portugal (+351)', value: '+351' },
  { label: '🇶🇦 Qatar (+974)', value: '+974' },
  { label: '🇷🇴 Romania (+40)', value: '+40' },
  { label: '🇷🇺 Russia (+7)', value: '+7_RU' },
  { label: '🇷🇼 Rwanda (+250)', value: '+250' },
  { label: '🇸🇦 Saudi Arabia (+966)', value: '+966' },
  { label: '🇸🇳 Senegal (+221)', value: '+221' },
  { label: '🇷🇸 Serbia (+381)', value: '+381' },
  { label: '🇸🇱 Sierra Leone (+232)', value: '+232' },
  { label: '🇸🇬 Singapore (+65)', value: '+65' },
  { label: '🇸🇰 Slovakia (+421)', value: '+421' },
  { label: '🇸🇮 Slovenia (+386)', value: '+386' },
  { label: '🇸🇧 Solomon Islands (+677)', value: '+677' },
  { label: '🇸🇴 Somalia (+252)', value: '+252' },
  { label: '🇿🇦 South Africa (+27)', value: '+27' },
  { label: '🇸🇸 South Sudan (+211)', value: '+211' },
  { label: '🇪🇸 Spain (+34)', value: '+34' },
  { label: '🇱🇰 Sri Lanka (+94)', value: '+94' },
  { label: '🇸🇩 Sudan (+249)', value: '+249' },
  { label: '🇸🇷 Suriname (+597)', value: '+597' },
  { label: '🇸🇪 Sweden (+46)', value: '+46' },
  { label: '🇨🇭 Switzerland (+41)', value: '+41' },
  { label: '🇸🇾 Syria (+963)', value: '+963' },
  { label: '🇹🇼 Taiwan (+886)', value: '+886' },
  { label: '🇹🇯 Tajikistan (+992)', value: '+992' },
  { label: '🇹🇿 Tanzania (+255)', value: '+255' },
  { label: '🇹🇭 Thailand (+66)', value: '+66' },
  { label: '🇹🇱 Timor-Leste (+670)', value: '+670' },
  { label: '🇹🇬 Togo (+228)', value: '+228' },
  { label: '🇹🇴 Tonga (+676)', value: '+676' },
  { label: '🇹🇹 Trinidad & Tobago (+1-868)', value: '+1868' },
  { label: '🇹🇳 Tunisia (+216)', value: '+216' },
  { label: '🇹🇷 Turkey (+90)', value: '+90' },
  { label: '🇹🇲 Turkmenistan (+993)', value: '+993' },
  { label: '🇺🇬 Uganda (+256)', value: '+256' },
  { label: '🇺🇦 Ukraine (+380)', value: '+380' },
  { label: '🇦🇪 United Arab Emirates (+971)', value: '+971' },
  { label: '🇬🇧 United Kingdom (+44)', value: '+44' },
  { label: '🇺🇾 Uruguay (+598)', value: '+598' },
  { label: '🇺🇿 Uzbekistan (+998)', value: '+998' },
  { label: '🇻🇺 Vanuatu (+678)', value: '+678' },
  { label: '🇻🇪 Venezuela (+58)', value: '+58' },
  { label: '🇻🇳 Vietnam (+84)', value: '+84' },
  { label: '🇾🇪 Yemen (+967)', value: '+967' },
  { label: '🇿🇲 Zambia (+260)', value: '+260' },
  { label: '🇿🇼 Zimbabwe (+263)', value: '+263' },
]

function dialCode(val: string): string {
  if (val.includes('_')) return val.split('_')[0]
  return val
}

function getErrorMsg(data: Record<string, unknown>): string {
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return (data.message as string) || (data.error as string) || 'Something went wrong.'
}

function bestCountryEntry(storedDial: string): string {
  const norm = (storedDial || '+1').trim()
  const match = COUNTRY_CODES.find(c => !c.disabled && dialCode(c.value) === norm)
  return match ? match.value : '+1_CA'
}

function VerifyPhoneFormInner({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const changeMode = searchParams.get('change') === '1'
  const prefix = agentPrefix ?? `/agent/${slug}`
  const agentFirstName = agent?.name?.split(' ')[0] ?? ''

  const [countryEntry, setCountryEntry] = useState('+1_CA')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)
  const [prefilled, setPrefilled] = useState(false)
  const [autoSending, setAutoSending] = useState(false)

  useEffect(() => {
    authFetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        const u = data?.user
        if (u?.phone) {
          const dial = u.phone_country_code || '+1'
          setPhone(u.phone)
          setCountryEntry(bestCountryEntry(dial))
          setPrefilled(true)

          // Auto-send OTP and skip straight to code entry — unless the user
          // explicitly navigated here to change their number (?change=1).
          if (!changeMode) {
            setAutoSending(true)
            try {
              const sendRes = await authFetch('/api/auth/phone-send', { method: 'POST' })
              if (sendRes.ok) {
                router.replace(`${prefix}/verify-phone/otp?phone=${encodeURIComponent(dial + ' ' + u.phone)}`)
                return // stay in autoSending state while navigating
              }
            } catch {
              // fall through to show the manual form
            }
            setAutoSending(false)
            setError('We couldn\'t send a code automatically. Enter your number below and tap Send Code.')
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) { setError('Please enter a valid phone number.'); return }
    const dial = dialCode(countryEntry)
    setLoading(true)
    try {
      const saveRes = await authFetch('/api/auth/phone-save', {
        method: 'POST',
        body: JSON.stringify({ phone: digits, phone_country_code: dial }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) { setError(getErrorMsg(saveData)); return }

      const sendRes = await authFetch('/api/auth/phone-send', { method: 'POST' })
      const sendData = await sendRes.json()
      if (!sendRes.ok) { setError(getErrorMsg(sendData)); return }

      router.push(`${prefix}/verify-phone/otp?phone=${encodeURIComponent(dial + ' ' + phone)}`)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show spinner while loading user data or while auto-sending
  if (loadingUser || autoSending) {
    return (
      <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Step 2 of 3 — Phone Verification">
        <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ color: '#9ca3af', fontSize: 14 }}>{autoSending ? 'Sending you a code…' : 'Loading…'}</span>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Step 2 of 3 — Phone Verification">
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
        {prefilled ? 'Confirm your phone number' : 'Add your phone number'}
      </h1>
      <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
        {prefilled
          ? 'We\'ll send a one-time code to confirm this number. You can update it if needed.'
          : 'We\'ll send a one-time verification code. Standard rates may apply.'}
      </p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 16, color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Mobile Number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={countryEntry} onChange={e => e.target.value && setCountryEntry(e.target.value)}
              style={{ ...inputStyle, width: 200, flexShrink: 0 }}>
              {COUNTRY_CODES.map((c, i) => (
                <option key={`${c.value}-${i}`} value={c.value} disabled={c.disabled}>{c.label}</option>
              ))}
            </select>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="604-555-1234" autoComplete="tel-national"
              style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
          {/* This previously read "used for account security only, not for marketing",
              which was not true: the same registration hands the number to the agent
              and to their CRM so they can follow up. Saying so plainly is both
              accurate and a better ask - people give a realtor their number precisely
              so the realtor can call them. */}
          We verify your number so we know it&apos;s really you. {agentFirstName || 'Your agent'} may
          use it to follow up about homes you ask about. We don&apos;t sell your details.
        </p>

        <button type="submit" disabled={loading}
          style={{ background: loading ? '#ccc' : 'var(--cta-primary)', color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7, padding: '13px 0', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', letterSpacing: 0.2, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
          {loading ? 'Sending code…' : 'Send Code →'}
        </button>
      </form>
    </AuthSplitLayout>
  )
}

export default function VerifyPhoneForm({ agent, slug, agentPrefix }: { agent: AgentProfile; slug: string; agentPrefix?: string }) {
  return (
    <Suspense fallback={
      <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Step 2 of 3 — Phone Verification">
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</span>
        </div>
      </AuthSplitLayout>
    }>
      <VerifyPhoneFormInner agent={agent} slug={slug} agentPrefix={agentPrefix} />
    </Suspense>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.2, marginBottom: 5, display: 'block' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 7,
  fontSize: 14, color: '#1a1a1a', background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
}
