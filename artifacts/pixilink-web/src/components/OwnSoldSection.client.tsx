'use client'

import { useEffect, useState } from 'react'
import type { AgentListing } from '@/lib/types'
import ListingStrip from './ListingStrip'
import { SoldPriceBanner } from './SoldPriceGate'
import { nextStepPath } from '@/lib/auth-client'

interface Props {
  listings: AgentListing[]
  slug: string
  agentPrefix?: string
  totalSold: number
  city?: string
}

export default function OwnSoldSection({ listings, slug, agentPrefix, totalSold: _totalSold, city }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [nextUrl, setNextUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/api/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: { user?: { id?: string | number; next_step?: string } | null } | null) => {
        if (!d?.user?.id) return
        if (d.user.next_step === 'done') {
          setIsLoggedIn(true)
        } else {
          setNextUrl(nextStepPath(slug, d.user.next_step ?? '', agentPrefix))
        }
      })
      .catch(() => {})
  }, [slug, agentPrefix])

  return (
    <>
      <ListingStrip listings={listings} showSoldPrice isLoggedIn={isLoggedIn} />
      {!isLoggedIn && (
        <div style={{ marginTop: 20 }}>
          <SoldPriceBanner
            city={city ?? 'your area'}
            slug={slug}
            agentPrefix={agentPrefix}
            nextStepUrl={nextUrl}
          />
        </div>
      )}
    </>
  )
}
