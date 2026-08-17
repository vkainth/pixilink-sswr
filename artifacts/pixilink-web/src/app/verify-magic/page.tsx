import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ token?: string; agent_slug?: string; return_to?: string }>
}

export default async function VerifyMagicRoot({ searchParams }: Props) {
  const { token, agent_slug, return_to } = await searchParams

  const slug = agent_slug || 'randy'

  if (token) {
    const returnParam = return_to ? `&return_to=${encodeURIComponent(return_to)}` : ''
    redirect(`/agent/${slug}/verify-magic?token=${encodeURIComponent(token)}${returnParam}`)
  }

  redirect(`/agent/${slug}/sign-in`)
}
