'use client'

import { useEffect } from 'react'
import { setListingData } from '@/lib/listing-store'

interface Props {
  address: string
  price: string
  mlsNum?: string
  isSold?: boolean
}

/**
 * Renders nothing. Sets the module-level listing store so that layout-level
 * client components (e.g. W4StickyFooter) can read real listing data without
 * needing a downward prop chain through the layout.
 *
 * Clears the store on unmount so navigating away from the listing page resets it.
 */
export default function ListingDataSetter({ address, price, mlsNum, isSold }: Props) {
  useEffect(() => {
    setListingData({ address, price, mlsNum, isSold })
    return () => { setListingData(null) }
  }, [address, price, mlsNum, isSold])
  return null
}
