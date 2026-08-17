import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}

export const revalidate = false

export default async function TownhomesRedirectPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const q = new URLSearchParams(sp as Record<string, string>).toString()
  redirect(`/agent/${slug}/townhouses-for-sale${q ? `?${q}` : ''}`)
}
