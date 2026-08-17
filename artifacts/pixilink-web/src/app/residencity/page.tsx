import ResidencityHub from '@/components/ResidencityHub'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metro Vancouver Real Estate — Tri-Cities & Burnaby',
  description: 'Explore real estate market data, active listings and neighbourhood insights for Tri-Cities and Burnaby with local MLS® experts.',
}

export const revalidate = 300

export default function ResidencityHubPage() {
  return <ResidencityHub />
}
