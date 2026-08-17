/**
 * Lightweight module-level store that lets the listing page publish its data
 * so layout-level client components (e.g. W4StickyFooter) can read it.
 *
 * React context cannot flow upward (child → parent), so we use a plain pub-sub
 * instead. The listing page mounts a ListingDataSetter client component that
 * calls setListingData() on mount and clears it on unmount.
 */

export interface ListingData {
  address: string
  price: string
  mlsNum?: string
  isSold?: boolean
}

type Listener = () => void

let _data: ListingData | null = null
const _listeners = new Set<Listener>()

export function setListingData(data: ListingData | null): void {
  _data = data
  _listeners.forEach(fn => fn())
}

export function getListingData(): ListingData | null {
  return _data
}

export function subscribeListingData(fn: Listener): () => void {
  _listeners.add(fn)
  return () => { _listeners.delete(fn) }
}
