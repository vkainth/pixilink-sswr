import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ agent_slug?: string }>
}

export default async function AcceptTermsRoot({ searchParams }: Props) {
  const { agent_slug } = await searchParams
  redirect(`/agent/${agent_slug || 'randy'}/accept-terms`)
}
