import type { Metadata } from 'next'
import './globals.css'
import { getPlatformSettings } from '@/lib/admin-api'
import NextTopLoader from 'nextjs-toploader'
import { playfair, inter } from '@/lib/fonts'

export async function generateMetadata(): Promise<Metadata> {
  const platform = await getPlatformSettings()
  return {
    title: { template: '%s | Pixilink', default: 'Pixilink Agent Sites' },
    description: 'South Surrey White Rock Real Estate',
    ...(platform.global_noindex ? { robots: { index: false, follow: false } } : {}),
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={[playfair.variable, inter.variable].join(' ')}>
        <NextTopLoader color="#c9a84c" height={3} showSpinner={false} />
        {children}
      </body>
    </html>
  )
}
