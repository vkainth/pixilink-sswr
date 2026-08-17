import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ token?: string; email?: string; agent_slug?: string }>
}

export default async function ResetPasswordRoot({ searchParams }: Props) {
  const { token, email, agent_slug } = await searchParams
  const slug = agent_slug || 'randy'

  if (token && email) {
    redirect(`/agent/${slug}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
  }

  redirect(`/agent/${slug}/forgot-password`)
}
