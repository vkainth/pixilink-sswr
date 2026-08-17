import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verifying Sign-In Link',
  description: 'Verifying your sign-in link. You will be redirected momentarily.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
