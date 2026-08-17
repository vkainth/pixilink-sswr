import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description: 'Complete your profile to personalise your property search and receive relevant listings.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
