import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authMe } from '@/lib/api'
import { nextStepPath } from '@/lib/next-step'
import SignInForm from './SignInForm.client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to access your saved listings and property alerts.',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ return_to?: string; return?: string }>
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const returnTo = sp.return_to || sp.return || `/agent/${slug}`

  const jar = await cookies()
  const token = jar.get('pxl_session')?.value
  if (token) {
    const user = await authMe(token)
    if (user) {
      if (user.next_step === 'done') {
        redirect(returnTo)
      } else {
        redirect(nextStepPath(slug, user.next_step))
      }
    }
  }

  return <SignInForm />
}
