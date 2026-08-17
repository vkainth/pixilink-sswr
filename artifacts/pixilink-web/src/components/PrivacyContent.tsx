import Link from 'next/link'

interface Props {
  backHref?: string
}

export default function PrivacyContent({ backHref = '/' }: Props) {
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

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2.5rem' }}>LAST UPDATED: January 1, 2025</p>

      <p>
        This website/app collects information, some of which can be used to personally identify and/or locate
        you (Personal Information), in order to facilitate the functionality. This document is intended to help
        users understand what personal information is collected, as well as how it is collected, processed, used,
        and disclosed. By using this website and/or otherwise communicating with us, you agree to this Privacy
        Policy. Please take a moment to read it.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Information Collected</h2>
      <p>We collect information that is provided by users, as well as information provided during normal use.</p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Information Provided by Users</h2>
      <p>
        We collect personal information necessary to create a user profile. This includes a user&rsquo;s name,
        email address, and phone number.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Information Automatically Collected</h2>
      <p>
        We automatically collect information, including personal information, about the services you use and how
        you use them. This information is necessary to provide and improve functionalities.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Geo-location Information</h2>
      <p>
        When you use certain features, we may collect information about your precise or approximate location as
        determined through data such as your IP address or mobile device&rsquo;s GPS to offer you an improved
        user experience. Most mobile devices allow you to control or disable the use of location services for
        applications in the device&rsquo;s settings menu. We may also collect this information even when you are
        not using the app if this connection is enabled through your settings or device permissions. Activation
        of location services on your device or browser indicates consent to collect information on your physical
        location.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Usage Information</h2>
      <p>
        We collect information about your interactions, such as property views, mortgage calculator usage, map
        search and usage data.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Log Data and Device Information</h2>
      <p>
        We automatically collect log data and device information when you access the site. That information
        includes, but is not limited to: IP address, access dates and times, hardware and software information,
        device information, device event information, unique identifiers, crash data, cookie data, and the pages
        you&rsquo;ve viewed or engaged with before or after.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Cookies and Similar Technologies</h2>
      <p>
        We use cookies and other similar technologies, such as web beacons, pixels, and mobile identifiers. We
        may also allow our business partners to use these tracking technologies or engage others to track your
        behavior on our behalf.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Information Collected from Third Parties</h2>
      <p>
        We may obtain information from third parties in order to maximize the functionality. If you link or
        connect with a third-party service (e.g. Google, Facebook), the third-party service may send us
        information such as your registration and profile information from that service. This information varies
        and is controlled by that service or as authorized by you via your privacy settings at that service.
      </p>
      <p>
        Third-party services retain their own rules on the collection, use, and disclosure of information. You
        are encouraged to review the privacy policies of any third parties.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>How We Use the Information</h2>
      <p><strong>Provide, Improve, and Develop</strong></p>
      <p>
        We process this information given our legitimate interest in improving our users&rsquo; experience, and
        where it is necessary for the adequate performance of the contract with you.
      </p>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        <li style={{ marginBottom: '0.25rem' }}>Enable you to access and use the service</li>
        <li style={{ marginBottom: '0.25rem' }}>Operate, protect, improve, and optimize the experience, such as by performing analytics and conducting research</li>
        <li style={{ marginBottom: '0.25rem' }}>Provide customer service</li>
        <li style={{ marginBottom: '0.25rem' }}>Send you service or support messages, updates, security alerts, and account notifications</li>
      </ul>

      <p><strong>Create and Maintain a Trusted and Safer Environment</strong></p>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        <li style={{ marginBottom: '0.25rem' }}>Detect and prevent fraud, spam, abuse, security incidents, and other harmful activity.</li>
        <li style={{ marginBottom: '0.25rem' }}>Comply with our legal obligations.</li>
        <li style={{ marginBottom: '0.25rem' }}>Enforce our Terms of Service and other policies.</li>
      </ul>

      <p><strong>Communicate with Users</strong></p>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        <li style={{ marginBottom: '0.25rem' }}>To respond to your requests for information about our products or services.</li>
        <li style={{ marginBottom: '0.25rem' }}>To provide product enablement and licensing, customer service and support.</li>
        <li style={{ marginBottom: '0.25rem' }}>To send you technical notices, updates, security alerts, and support and administrative messages.</li>
        <li style={{ marginBottom: '0.25rem' }}>To inform you about our products and services.</li>
        <li style={{ marginBottom: '0.25rem' }}>To send marketing, advertising or event materials to which you&rsquo;ve agreed, requested or subscribed.</li>
      </ul>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Information Sharing &amp; Disclosure</h2>
      <p>
        User information, including information that may personally identify the user and/or the user&rsquo;s
        location, is shared with realtors from other brokerages.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Third-Party Services</h2>
      <p>
        Some information may be shared with authorized third-party services that we employ to provide an improved
        user experience and functionality. These services include but are not limited to Facebook, Google, and
        other services that provide an API utilized by this site.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Compliance with Law, Responding to Legal Requests, Preventing Harm</h2>
      <p>
        We may disclose your information, including personal information, to courts, law enforcement or
        governmental authorities, or authorized third parties, if and to the extent we are required or permitted
        to do so by law or if such disclosure is reasonably necessary: (i) to comply with our legal obligations,
        (ii) to comply with legal process and to respond to claims asserted, (iii) to respond to verified
        requests relating to a criminal investigation or alleged or suspected illegal activity or any other
        activity that may expose us, you, or any other of our users to legal liability, (iv) to enforce and
        administer our Terms of Service, or (v) to protect the rights, property or personal safety of our
        employees, users, or members of the public.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Data Integrity / Security</h2>
      <p>
        Personal information collected via the platform is protected with reasonable and appropriate physical,
        electronic, and procedural safeguards, and encryption protocols for passwords. Any sections that collect
        sensitive personal information use industry-standard secure socket layer (TLS/SSL) encryption.
      </p>
      <p>
        If you know or have reason to believe that your account credentials have been lost, stolen,
        misappropriated, or otherwise compromised, or in case of any actual or suspected unauthorized use of
        your account, please contact us at{' '}
        <a href="mailto:info@pixilink.com" style={{ color: '#555' }}>info@pixilink.com</a>.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Cookie Policy</h2>
      <p>
        Our website uses standard technology known as &ldquo;cookies&rdquo; including session cookies and
        persistent cookies. Session cookies temporarily keep your settings. This information is stored until
        your browser is closed. Persistent cookies are created for specific functions you may choose to use on
        the website including, but not limited to: accepting terms of use; saving searches; and saving
        favourites. Persistent cookies are used to improve your experience of the website and are retained from
        session to session. These cookies remain after the browser is closed and are stored locally on your
        system. You may choose to delete persistent cookies after visiting the website.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Google Maps / Earth</h2>
      <p>
        Parts of the app use Google Maps/Earth services, including the Google Maps API(s). Use of Google
        Maps/Earth is subject to Google Maps/Earth Additional Terms of Use and the Google Privacy Policy.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Google Analytics</h2>
      <p>
        We use Google Analytics to collect aggregated information regarding the access and use of the website.
        Such aggregated information may include what pages users access or visit, when and how users visit, and
        other information users may volunteer. We collect and use such information to improve the quality of the
        website/app.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Analyzing Your Communications</h2>
      <p>
        We may review, scan, or analyze your communications for fraud prevention, risk assessment, regulatory
        compliance, investigation, product development, research, and customer support purposes.
      </p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Data Correction, Account Deactivation, and Data Deletion</h2>
      <p>
        If a user needs to update, correct, or otherwise alter the personal information provided in the creation
        of the user&rsquo;s account/profile, the user must do so by emailing{' '}
        <a href="mailto:info@pixilink.com" style={{ color: '#555' }}>info@pixilink.com</a>.
      </p>
      <p>
        If at any time a user wishes to stop sharing information/data, the user may request that the
        user&rsquo;s account be deactivated by email. Account deactivation will fully remove the user from the
        active user list, and the user&rsquo;s information will no longer be available to any connected real
        estate agents or third-party service providers. It may take up to seven (7) days to deactivate a
        user&rsquo;s account.
      </p>
      <p>We reserve the right to delete user information.</p>

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2rem', marginBottom: '0.75rem' }}>Changes to This Privacy Policy</h2>
      <p>We reserve the right to modify this Privacy Policy at any time in accordance with this provision.</p>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '3rem 0 1.5rem' }} />
      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        Questions? Contact us at{' '}
        <a href="mailto:info@pixilink.com" style={{ color: '#555' }}>info@pixilink.com</a>
      </p>
    </div>
  )
}
