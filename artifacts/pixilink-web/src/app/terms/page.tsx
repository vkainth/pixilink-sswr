import type { Metadata } from 'next'
import TermsContent from '@/components/TermsContent'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Pixilink',
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return <TermsContent backHref="/" />
}
