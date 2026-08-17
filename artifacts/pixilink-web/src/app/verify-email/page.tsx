import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ token?: string; agent_slug?: string }>
}

export default async function VerifyEmailRoot({ searchParams }: Props) {
  const { token, agent_slug } = await searchParams

  const slug = agent_slug || 'randy'

  if (token) {
    redirect(`/agent/${slug}/verify-email?token=${encodeURIComponent(token)}`)
  }

  redirect(`/agent/${slug}/sign-in`)
}
