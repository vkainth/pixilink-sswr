import { regionSlugForAgent, resolveAgentPrefix } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Check Your Inbox',
  description: 'A sign-in link has been sent to your inbox. Check your email to continue.',
  robots: { index: false, follow: false },
}

export default async function MagicLinkSentPage({
  searchParams,
  params,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ email?: string }>
}) {
  const { slug } = await params
  const { email } = await searchParams
  const prefix = resolveAgentPrefix(slug, null)

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>📬</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
          Check your inbox
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '0 0 8px' }}>
          We&apos;ve sent a sign-in link to
        </p>
        {email && (
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: '0 0 20px' }}>
            {decodeURIComponent(email)}
          </p>
        )}
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 32px' }}>
          The link expires in 15 minutes. If you don&apos;t see it, check your spam folder.
        </p>
        <a
          href={`${prefix}/login`}
          style={{
            display: 'inline-block', fontSize: 13, color: 'var(--accent)',
            textDecoration: 'none', fontWeight: 600,
          }}
        >
          ← Back to sign in
        </a>
      </div>
    </div>
  )
}
