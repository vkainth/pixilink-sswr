import { generateSubareaMetadata, SubareaMarketContent } from './_SubareaMarketShared'
import type { Metadata } from 'next'
import { playfair } from '@/lib/fonts'

interface Props {
  params: Promise<{ slug: string; subarea: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const revalidate = 300

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, subarea } = await params
  const sp = await searchParams
  // ?month= is kept for backwards-compat but middleware 301s it to /m/YYYY-MM;
  // reading it here ensures metadata is correct for any un-redirected requests.
  const selectedMonth = typeof sp.month === 'string' && sp.month ? sp.month : null
  return generateSubareaMetadata(slug, subarea, selectedMonth)
}

export default async function SubareaMarketPage({ params, searchParams }: Props) {
  const { slug, subarea } = await params
  const sp = await searchParams
  const selectedMonth = typeof sp.month === 'string' && sp.month ? sp.month : null
  return <SubareaMarketContent slug={slug} subarea={subarea} selectedMonth={selectedMonth} />
}
