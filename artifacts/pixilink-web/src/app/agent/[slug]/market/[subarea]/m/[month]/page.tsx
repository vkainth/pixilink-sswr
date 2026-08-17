/**
 * /market/[subarea]/m/[month] — canonical path-based historical month view.
 *
 * e.g. /market/coquitlam-west/m/2026-05
 *
 * The middleware 301-redirects ?month=YYYY-MM query strings here so Google
 * can index each month as a distinct, crawlable URL.
 */
import { generateSubareaMetadata, SubareaMarketContent } from '../../_SubareaMarketShared'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string; subarea: string; month: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, subarea, month } = await params
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { title: 'Market Stats' }
  return generateSubareaMetadata(slug, subarea, month)
}

export default async function SubareaMonthPage({ params }: Props) {
  const { slug, subarea, month } = await params
  // Guard against malformed month segments (e.g. /m/foobar or /m/2025-13)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) notFound()
  return <SubareaMarketContent slug={slug} subarea={subarea} selectedMonth={month} />
}
