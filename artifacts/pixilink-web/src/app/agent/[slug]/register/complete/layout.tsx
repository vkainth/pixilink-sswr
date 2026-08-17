import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registration Complete',
  description: 'Your account has been created. You can now save listings and receive property alerts.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
