'use client'

import { useEffect, useState } from 'react'
import ListingStrip from './ListingStrip'
import { SoldPriceBanner } from './SoldPriceGate'
import type { AgentListing } from '@/lib/types'

interface Props {
  listings: AgentListing[]
  agentSlug: string
  agentPrefix?: string
  city: string
}

export default function NeighbourhoodSoldGate({ listings, agentSlug, agentPrefix, city }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/api/me`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { user?: { id?: string | number } | null } | null) => {
        setIsLoggedIn(!!(d?.user?.id))
      })
      .catch(() => setIsLoggedIn(false))
  }, [])

  if (!listings.length) return null

  return (
    <>
      <ListingStrip listings={listings} showSoldPrice={isLoggedIn === true} />
      {isLoggedIn === false && (
        <SoldPriceBanner city={city} slug={agentSlug} agentPrefix={agentPrefix} />
      )}
    </>
  )
}
