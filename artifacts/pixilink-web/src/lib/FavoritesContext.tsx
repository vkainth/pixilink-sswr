'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface FavoritesCtx {
  saved: Set<string>
  isLoggedIn: boolean
  loading: boolean
  isSaved: (mlsNo: string) => boolean
  toggle: (mlsNo: string, signInUrl?: string) => void
}

const Ctx = createContext<FavoritesCtx>({
  saved: new Set(),
  isLoggedIn: false,
  loading: false,
  isSaved: () => false,
  toggle: () => undefined,
})

export function useFavorites() {
  return useContext(Ctx)
}

export default function FavoritesProvider({ children, signInUrl, initialIsLoggedIn }: { children: React.ReactNode; signInUrl?: string; initialIsLoggedIn?: boolean }) {
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialIsLoggedIn))
  const [loading, setLoading] = useState(Boolean(initialIsLoggedIn))
  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // initialIsLoggedIn is computed server-side (RSC layout) from the real,
    // httpOnly pxl_session cookie via authMe(). Anonymous visitors and crawlers
    // never have a valid session, so initialIsLoggedIn is false for them and we
    // skip this fetch entirely instead of firing it and getting a 401.
    if (!initialIsLoggedIn) {
      setLoading(false)
      return
    }
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/user/favourites`, { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { setIsLoggedIn(false); return null }
        if (!r.ok) return null
        setIsLoggedIn(true)
        return r.json()
      })
      .then((data: { mls_nos: string[] } | null) => {
        if (data?.mls_nos) setSaved(new Set(data.mls_nos))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialIsLoggedIn])

  const toggle = useCallback((mlsNo: string, overrideSignInUrl?: string) => {
    if (!isLoggedIn) {
      const url = overrideSignInUrl || signInUrl
      if (url) {
        sessionStorage.setItem('pxl_return_to', window.location.pathname)
        window.location.href = url
      }
      return
    }
    if (pendingRef.current.has(mlsNo)) return

    const wasSaved = saved.has(mlsNo)
    setSaved(prev => {
      const next = new Set(prev)
      wasSaved ? next.delete(mlsNo) : next.add(mlsNo)
      return next
    })

    pendingRef.current.add(mlsNo)
    const method = wasSaved ? 'DELETE' : 'POST'
    const url = wasSaved ? `/api/user/favourites/${encodeURIComponent(mlsNo)}` : '/api/user/favourites'
    const body = wasSaved ? undefined : JSON.stringify({ mls_no: mlsNo })

    fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body,
    })
      .then(r => {
        if (!r.ok) {
          setSaved(prev => {
            const next = new Set(prev)
            wasSaved ? next.add(mlsNo) : next.delete(mlsNo)
            return next
          })
        }
      })
      .catch(() => {
        setSaved(prev => {
          const next = new Set(prev)
          wasSaved ? next.add(mlsNo) : next.delete(mlsNo)
          return next
        })
      })
      .finally(() => pendingRef.current.delete(mlsNo))
  }, [isLoggedIn, saved, signInUrl])

  const isSaved = useCallback((mlsNo: string) => saved.has(mlsNo), [saved])

  return (
    <Ctx.Provider value={{ saved, isLoggedIn, loading, isSaved, toggle }}>
      {children}
    </Ctx.Provider>
  )
}
