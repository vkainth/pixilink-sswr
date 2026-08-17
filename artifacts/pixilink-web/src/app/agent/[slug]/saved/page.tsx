import { getAgent, authMe, getListingDetail, resolveAgentPrefix } from '@/lib/api'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import ListingCard from '@/components/ListingCard'
import type { AgentListing, ListingDetail } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Saved Listings',
  description: 'View and manage your saved property listings.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
}

const LARAVEL = process.env.LARAVEL_INTERNAL_URL || process.env.LARAVEL_API_URL || 'https://bccondosandhomes.com'

async function getSavedMlsNos(token: string): Promise<string[]> {
  try {
    const res = await fetch(`${LARAVEL}/api-internal/favourites`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.mls_nos) ? data.mls_nos : []
  } catch {
    return []
  }
}

export default async function SavedListingsPage({ params }: Props) {
  const { slug } = await params
  const jar = await cookies()
  const token = jar.get('pxl_session')?.value

  const [agent, user] = await Promise.all([
    getAgent(slug),
    token ? authMe(token) : Promise.resolve(null),
  ])

  if (!agent) notFound()

  const agentPrefix = resolveAgentPrefix(slug, null)

  if (!user) {
    redirect(`${agentPrefix}/login`)
  }

  const mlsNos = token ? await getSavedMlsNos(token) : []

  // A transient backend failure on one saved listing must not break the whole
  // page — swallow it to null so the listing is simply skipped and reappears on
  // the next load, rather than 500-ing the entire saved list.
  const listings = mlsNos.length > 0
    ? (await Promise.all(mlsNos.map(mls => getListingDetail(slug, mls).catch(() => null)))).filter((l): l is ListingDetail => l !== null)
    : []

  const signInUrl = `${agentPrefix}/login`

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--primary-bg)' }}>
          Saved Homes
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 15 }}>
          {listings.length > 0
            ? `${listings.length} saved home${listings.length === 1 ? '' : 's'}`
            : 'Your saved homes will appear here'}
        </p>
      </div>

      {listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#f9fafb', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏠</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#374151' }}>No saved listings yet</h2>
          <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 24px', lineHeight: 1.6, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Heart a listing to save it here. You can save as many as you like and come back anytime.
          </p>
          <a href={`${agentPrefix}/listings`}
            style={{ display: 'inline-block', background: 'var(--cta-primary)', color: 'var(--cta-primary-text)', textDecoration: 'none', borderRadius: 7, padding: '12px 28px', fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>
            Browse Homes
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing as AgentListing}
              isLoggedIn={true}
              showSoldPrice={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
