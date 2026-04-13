import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import LocationDetailClient from '@/components/locations/LocationDetailClient'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: location } = await admin
    .from('conscious_locations')
    .select(
      'name, description, why_conscious, why_conscious_en, cover_image_url, slug'
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!location) {
    return { title: 'Location | Crowd Conscious' }
  }

  const title = `${location.name} — Conscious Location | Crowd Conscious`
  const desc =
    (location.description as string | null) ||
    (location.why_conscious as string | null) ||
    (location.why_conscious_en as string | null) ||
    ''

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: location.cover_image_url ? [location.cover_image_url] : undefined,
    },
  }
}

export default async function LocationSlugPage({ params }: Props) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: location } = await admin.from('conscious_locations').select('*').eq('slug', slug).maybeSingle()

  if (!location) notFound()

  const marketId = location.current_market_id
  const { data: outcomes } = marketId
    ? await admin
        .from('market_outcomes')
        .select('id, label, sort_order')
        .eq('market_id', marketId)
        .order('sort_order', { ascending: true })
    : { data: [] }

  return (
    <LocationDetailClient
      location={{
        ...location,
        current_market_id: location.current_market_id,
      }}
      outcomes={outcomes ?? []}
    />
  )
}
