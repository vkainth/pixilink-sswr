'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-client'
import { clientAgentPrefix } from '@/lib/api'
import AuthSplitLayout from '@/components/AuthSplitLayout'
import type { AgentProfile } from '@/lib/types'

const STEPS = [
  { state: 'done' as const },
  { state: 'done' as const },
  { state: 'active' as const },
]

const TERMS_HTML = `<h3 style="margin:0 0 12px;font-size:14px;color:#1a1a1a">Terms of Use Agreement</h3>
<p>By accessing any of the websites or mobile applications operated by the agent you agree to be bound by all of the TERMS & CONDITIONS and PRIVACY POLICY and agree that these terms constitute a binding contract between you and the agent.</p>
<h3 style="margin:16px 0 8px;font-size:14px;color:#1a1a1a">Copyright</h3>
<p>Property listings and other data available on this site are intended for private, non-commercial use by individuals. Any commercial use of the listings or data in whole or in part, directly or indirectly, is specifically forbidden except with the prior written authority of the owner of the copyright.</p>
<p>Users may, subject to the Terms and Conditions, print or otherwise save individual pages for private use. However, property listings and/or data may not be modified or altered in any respect, merged with other data or published in any form, in whole or in part. The prohibited uses include "screen scraping," "database scraping," and any other activities intended to collect, store, reorganize or manipulate or publish data on the pages produced by or displayed by this website.</p>
<p>REALTOR® is a certification mark owned by REALTOR® Canada Inc., a corporation owned by the National Association of REALTORS® and CREA. Multiple Listing Service® is a registered certification mark owned by CREA.</p>
<h3 style="margin:16px 0 8px;font-size:14px;color:#1a1a1a">Disclaimer</h3>
<p>We make no representations about the suitability of the data, information, or graphics published on this site. Everything on this site is provided "As Is" and "As Available" without warranty of any kind including all implied warranties and conditions of merchantability, fitness for a particular purpose, title and non-infringement. Neither REALTOR®, Pixilink nor any of its members, directors, officers, shareholders or affiliates shall be liable for any direct, incidental, consequential, indirect or punitive damages arising out of your access to or use of this site.</p>
<h3 style="margin:16px 0 8px;font-size:14px;color:#1a1a1a">Privacy Notice and Consent</h3>
<p>In accordance with the Rules of Cooperation of the CADREB, FVREB, and REBGV, and in conjunction with the Privacy Policy, you acknowledge understanding of and agreement with the following:</p>
<ul style="padding-left:18px;line-height:1.8">
<li>You have received, read and understood the brochure published by the British Columbia Real Estate Association entitled "Privacy Notice and Consent";</li>
<li>All data obtained from the MLS® VOW is intended for and may only be used for your personal, non-commercial use;</li>
<li>You have a bona fide interest in the purchase, sale or lease of real estate of the type being offered through the MLS® VOW;</li>
<li>You will not, and will not permit or assist others to, directly or indirectly: copy, redistribute or retransmit any MLS® VOW Data; display, post, disseminate, distribute, publish, broadcast, transfer, sell or sublicense any MLS® VOW Data to another person; or engage in scraping, data mining or any other activity intended to collect, store, re-organize, summarize or manipulate any MLS® VOW Data;</li>
<li>You acknowledge the Board's ownership of, and the validity of the Board's proprietary rights and copyright in the MLS® VOW Data and listing information;</li>
<li>You expressly authorize the Board or their duly authorized representatives to access the MLS® VOW and your information for the purposes of verifying compliance with and pursuing enforcement of the Terms of Use and all applicable rules, regulations, bylaws, policies, and laws.</li>
</ul>
<h3 style="margin:16px 0 8px;font-size:14px;color:#1a1a1a">Commercial Electronic Messages (CASL)</h3>
<p>The REALTOR® will only send CEMs, such as emails, in accordance with Canada's Anti-Spam Legislation ("CASL").</p>
<h3 style="margin:16px 0 8px;font-size:14px;color:#1a1a1a">Third Party Websites</h3>
<p>This website/app may contain links from other third party websites and all such websites are independent. The REALTOR® has no control over these third party websites and assumes no responsibility or obligations for such websites. The provision of such links does not constitute any endorsement of such linked websites, their content or information.</p>
<h3 style="margin:16px 0 8px;font-size:14px;color:#1a1a1a">Jurisdiction</h3>
<p>By accessing this website/app you agree that all matters relating to access to, or use of, this site shall be governed by the laws of the Province of British Columbia and the federal laws of Canada as applicable. You also agree and hereby submit to the exclusive jurisdiction and venue of the courts of the Province of British Columbia.</p>`

const PRIVACY_HTML = `<h3 style="margin:0 0 12px;font-size:14px;color:#1a1a1a">Privacy Policy</h3>
<p style="color:#6b7280;font-size:12px;margin:0 0 12px">Last updated: March 9, 2021</p>
<p>This website/app collects information, some of which can be used to personally identify and/or locate you (Personal Information), in order to facilitate functionality. By using this website you agree to this Privacy Policy.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Information Collected</h4>
<p>We collect information provided by users and information provided during normal use, including: name, email address, phone number, IP address, access dates and times, device information, and usage data such as property views and map searches.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Geo-location</h4>
<p>When you use certain features, we may collect information about your precise or approximate location as determined through data such as your IP address or mobile device's GPS to offer an improved user experience.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Cookies and Similar Technologies</h4>
<p>We use cookies and other similar technologies, such as web beacons, pixels, and mobile identifiers to operate and improve the service and for analytics.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">How We Use Information</h4>
<ul style="padding-left:18px;line-height:1.8">
<li>Enable you to access and use the service</li>
<li>Operate, protect, improve, and optimize the experience</li>
<li>Provide customer service and support</li>
<li>Send service messages, security alerts, and account notifications</li>
<li>Detect and prevent fraud, spam, abuse, and security incidents</li>
<li>Comply with legal obligations and enforce our Terms of Service</li>
</ul>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Information Sharing</h4>
<p>We do not sell your personal information. We may share information with service providers who assist us in operating the platform, subject to confidentiality agreements. We may disclose information when required by law.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Data Retention</h4>
<p>We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Contact</h4>
<p>If you have questions about this Privacy Policy, please contact us through the agent's website.</p>`

const DISCLOSURE_HTML = `<h3 style="margin:0 0 12px;font-size:14px;color:#1a1a1a">Disclosure of Representation in Trading Services</h3>
<p>Before you provide confidential information to a real estate licensee, the licensee is required to describe the type of relationship you may have with them and the duties they owe to you. Please read and acknowledge the following.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">No Agency Relationship Is Created</h4>
<p>By registering on and using this website you acknowledge and understand that these Terms of Use do not create an agency relationship and do not impose any financial obligation on you, nor do they create any representation agreement between you and the REALTOR® or brokerage operating this site.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Establishing a Relationship</h4>
<p>You acknowledge that, should you choose to enter into a lawful REALTOR®/consumer or REALTOR®/client relationship with the REALTOR® or brokerage, this will, where necessary, require completion of any applicable agency, non-agency, and other disclosure obligations, and execution of any required agreements.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Information Accuracy</h4>
<p>You understand that information on this site is deemed to be valid but is not guaranteed. It is your responsibility to confirm all information independently.</p>
<h4 style="margin:14px 0 6px;font-size:13px;color:#374151">Acknowledgement</h4>
<p>By checking the box below you acknowledge that you have received, read and understood this Disclosure of Representation in Trading Services.</p>`

interface ScrollPanelProps {
  title: string
  html: string
  checked: boolean
  onCheck: (v: boolean) => void
  label: string
}

function ScrollPanel({ title, html, checked, onCheck, label }: ScrollPanelProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{title}</div>
      <div
        style={{ height: 160, overflowY: 'auto', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', fontSize: 12, color: '#6b7280', lineHeight: 1.7, background: '#f9fafb' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheck(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, accentColor: 'var(--accent)' }}
        />
        <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{label}</span>
      </label>
    </div>
  )
}

export default function AcceptTermsForm({ agent, slug }: { agent: AgentProfile; slug: string }) {
  const router = useRouter()
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [disclosureChecked, setDisclosureChecked] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = privacyChecked && disclosureChecked && termsChecked

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/accept-terms', {
        method: 'POST',
        body: JSON.stringify({ terms: true, privacy: true, disclosure: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errData = data as Record<string, unknown>
        const firstValidationMsg = errData.errors
          ? (Object.values(errData.errors as Record<string, string[]>)[0]?.[0] ?? null)
          : null
        setError(
          (errData.error as string) ||
          (errData.message as string) ||
          firstValidationMsg ||
          'Something went wrong. Please try again.'
        )
        return
      }
      router.refresh()
      router.push(`${clientAgentPrefix(slug)}/register/complete`)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout agent={agent} steps={STEPS} stepLabel="Step 3 of 3 — Terms &amp; Privacy">
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>
        Almost there
      </h1>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>
        Please read and accept all three documents to access sold prices.
      </p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 7, padding: '10px 14px', marginBottom: 14, color: '#c0392b', fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <ScrollPanel
          title="Privacy Notice"
          html={PRIVACY_HTML}
          checked={privacyChecked}
          onCheck={setPrivacyChecked}
          label="I have read and agree to the Privacy Notice"
        />
        <ScrollPanel
          title="Disclosure of Representation"
          html={DISCLOSURE_HTML}
          checked={disclosureChecked}
          onCheck={setDisclosureChecked}
          label="I have read and understood the Disclosure of Representation"
        />
        <ScrollPanel
          title="Terms & Conditions"
          html={TERMS_HTML}
          checked={termsChecked}
          onCheck={setTermsChecked}
          label="I have read and agree to the Terms & Conditions"
        />

        <button type="submit" disabled={!canSubmit || loading}
          style={{
            background: canSubmit && !loading ? 'var(--cta-primary)' : '#ccc',
            color: 'var(--cta-primary-text)', border: 'none', borderRadius: 7,
            padding: '13px 0', fontWeight: 800, fontSize: 15,
            cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
            width: '100%', letterSpacing: 0.2, opacity: !canSubmit || loading ? 0.7 : 1, marginTop: 4,
          }}>
          {loading ? 'Saving…' : 'Confirm & Access Sold Prices →'}
        </button>
      </form>
    </AuthSplitLayout>
  )
}
