import Link from 'next/link'

interface Props {
  backHref?: string
}

export default function TermsContent({ backHref = '/' }: Props) {
  return (
    <div style={{
      maxWidth: 760,
      margin: '0 auto',
      padding: '3rem 1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#1a1a1a',
      background: '#ffffff',
    }}>
      <Link href={backHref} style={{ fontSize: 14, color: '#555', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
        ← Back to Home
      </Link>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Terms &amp; Conditions</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2.5rem' }}>LAST UPDATED: January 1, 2025</p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Terms of Use Agreement</h2>
      <p>
        By accessing any of the websites or mobile applications operated by the agent you agree to be bound by all
        of the TERMS &amp; CONDITIONS and PRIVACY POLICY and agree that these terms constitute a binding contract
        between you and Pixilink.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Copyright</h2>
      <p>
        Property listings and other data available on this site are intended for private, non-commercial use by
        individuals. Any commercial use of the listings or data in whole or in part, directly or indirectly, is
        specifically forbidden except with the prior written authority of the owner of the copyright.
      </p>
      <p>
        The users may, subject to the Terms and Conditions, print or otherwise save individual pages for private
        use. However, property listings and/or data may not be modified or altered in any respect, merged with
        other data or published in any form, in whole or in part. The prohibited uses include &ldquo;screen
        scraping,&rdquo; &ldquo;database scraping,&rdquo; and any other activities intended to collect, store,
        reorganize or manipulate or publish data on the pages produced by, or displayed by this website or its
        associated or affiliated websites.
      </p>
      <p>
        REALTOR® is a certification mark owned by REALTOR® Canada Inc., a corporation owned by the National
        Association of REALTORS® and CREA.
      </p>
      <p>
        Multiple Listing Service® is a registered certification mark owned by CREA and used to identify real
        estate services provided by brokers and salespersons who are members of CREA.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Disclaimer</h2>
      <p>
        We make no representations about the suitability of the data, information, or graphics published on this
        site. Everything on this site is provided &ldquo;As Is&rdquo; and &ldquo;As Available&rdquo; without
        warranty of any kind including all implied warranties and conditions of merchantability, fitness for a
        particular purpose, title and non-infringement. Neither REALTOR®, Pixilink, nor any of its members,
        directors, officers, shareholders or affiliates shall be liable for any direct, incidental, consequential,
        indirect or punitive damages arising out of your access to or use of this site.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Privacy Notice and Consent</h2>
      <p>
        In accordance with the Rules of Cooperation of the CADREB, FVREB, and REBGV, and in conjunction with
        Privacy Policy, the User acknowledges understanding of and agreement with the following:
      </p>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        <li style={{ marginBottom: '0.5rem' }}>
          The Registrant has received, read and understood the brochure published by the British Columbia Real
          Estate Association entitled &ldquo;Privacy Notice and Consent&rdquo;;
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          all data obtained from the MLS® VOW is intended for and may only be used for the User&rsquo;s
          personal, non-commercial use;
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          the Registrant has a bona fide interest in the purchase, sale or lease of real estate of the type
          being offered through the MLS® VOW;
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          the Registrant will not himself, and will not permit or assist others to, directly or indirectly:
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li style={{ marginBottom: '0.25rem' }}>copy, redistribute or retransmit any of the MLS® VOW Data or information provided;</li>
            <li style={{ marginBottom: '0.25rem' }}>display, post, disseminate, distribute, publish, broadcast, transfer, sell or sublicense any of the MLS® VOW Data to another person.</li>
            <li style={{ marginBottom: '0.25rem' }}>engage in Scraping (including &ldquo;screen scraping&rdquo; and &ldquo;database scraping&rdquo;), &ldquo;data mining&rdquo; or any other activity intended to collect, store, re-organize, summarize or manipulate any MLS® VOW Data or any related data;</li>
          </ul>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          the Registrant acknowledges the Board&rsquo;s ownership of, and the validity of the Board&rsquo;s
          proprietary rights and copyright in the MLS® VOW Data, and listing information; and
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          the Registrant expressly authorizes the Board or their duly authorized representatives, to access the
          MLS® VOW and User&rsquo;s information provided to the MLS® VOW Participant, for the purposes of
          verifying compliance with and pursuing enforcement of the Terms of Use and all applicable rules,
          regulations, bylaws, policies, and laws.
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Acknowledge and understand that the Terms of Use do not create an agency relationship and do not
          impose a financial obligation on the Registrant or create any representation agreement between the
          Registrant and the Participant;
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Acknowledge and enter into a lawful REALTOR®/consumer or REALTOR®/client relationship with the
          Participant, including, where necessary, completion of any applicable agency, non-agency, and other
          disclosure obligations, and execution of any required agreements;
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          Understand that information on this site is deemed to be valid but is not guaranteed. It is the
          responsibility of the registrants to confirm all information on their own.
        </li>
      </ul>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Communication</h2>
      <p>
        The Registrant expressly authorizes the Board, their duly authorized representatives or the REALTOR®,
        to call the registrant by the phone provided.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Commercial Electronic Messages (&ldquo;CEMs&rdquo;)</h2>
      <p>
        The REALTOR® will only send CEMs, such as emails, in accordance with Canada&rsquo;s Anti-Spam
        Legislation (&ldquo;CASL&rdquo;).
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Third Party Websites</h2>
      <p>
        The Website/App may contain links from other third party websites and all such websites are independent.
        Pixilink has no control over these third party websites and assumes no responsibility or obligations for
        such third party websites. The provision of such links does not constitute any endorsement of such linked
        websites, their content or information appearing on the Website/App.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Jurisdiction</h2>
      <p>
        The Website/App can be accessed from all provinces and territories of Canada, as well as from other
        countries around the world. As each of these jurisdictions has laws that may differ from those of the
        Province of British Columbia, by accessing the Website/App or Associated Services, you agree that all
        matters relating to access to, or use of, the Website/App or Associated Services, or any other
        hyperlinked website shall be governed by the laws of the Province of British Columbia and the federal
        laws of Canada as applicable and notwithstanding conflicts of law. You also agree and hereby submit to
        the exclusive jurisdiction and venue of the courts of the Province of British Columbia and acknowledge
        and do so voluntarily.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '3rem 0 1.5rem' }} />
      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        Questions? Contact us at{' '}
        <a href="mailto:info@pixilink.com" style={{ color: '#555' }}>info@pixilink.com</a>
      </p>
    </div>
  )
}
