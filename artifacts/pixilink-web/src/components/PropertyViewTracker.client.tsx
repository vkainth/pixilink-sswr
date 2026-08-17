'use client'

import { useEffect } from 'react'

interface Props {
  /** MLS number when tracking a listing page */
  listingId?: string
  /** Building slug when tracking a building page */
  buildingSlug?: string
  /** Human-readable address for display in lead detail (e.g. "1234 Elm St, Surrey") */
  addressLabel: string
}

/**
 * Fire-and-forget property view tracker.
 * Renders nothing; posts one background request on mount.
 * The backend silently ignores 401 (not logged in) — safe to render unconditionally.
 */
export default function PropertyViewTracker({ listingId, buildingSlug, addressLabel }: Props) {
  useEffect(() => {
    if (!listingId && !buildingSlug) return
    const body: Record<string, string> = { address_label: addressLabel }
    if (listingId)    body.listing_id    = listingId
    if (buildingSlug) body.building_slug = buildingSlug
    fetch('/api/user/property-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => { /* silent — 401 if not logged in, ignored */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, buildingSlug])
  return null
}
