'use client'

import { AgentSlugContext } from '@/lib/agent-context'
import FavoritesProvider from '@/lib/FavoritesContext'

interface Props {
  prefix: string
  signInUrl?: string
  initialIsLoggedIn?: boolean
  children: React.ReactNode
}

export default function AgentSlugProvider({ prefix, signInUrl, initialIsLoggedIn, children }: Props) {
  return (
    <AgentSlugContext.Provider value={prefix}>
      <FavoritesProvider signInUrl={signInUrl} initialIsLoggedIn={initialIsLoggedIn}>
        {children}
      </FavoritesProvider>
    </AgentSlugContext.Provider>
  )
}
