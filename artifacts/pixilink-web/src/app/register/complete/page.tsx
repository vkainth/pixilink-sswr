import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ agent_slug?: string }>
}

export default async function RegisterCompleteRoot({ searchParams }: Props) {
  const { agent_slug } = await searchParams
  redirect(`/agent/${agent_slug || 'randy'}/register/complete`)
}
