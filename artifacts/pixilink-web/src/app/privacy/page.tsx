import type { Metadata } from 'next'
import PrivacyContent from '@/components/PrivacyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy | Pixilink',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return <PrivacyContent backHref="/" />
}
