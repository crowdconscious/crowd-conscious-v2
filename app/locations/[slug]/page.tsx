import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import LocationDetailClient from '@/components/locations/LocationDetailClient'

type Props = { params: Promise<{ slug: string }> }

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://crowdconscious.app'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: location } = await admin
    .from('conscious_locations')
    .select(
      'name, description, why_conscious, why_conscious_en, total_votes, conscious_score, slug'
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
    `¿Es ${location.name} un Lugar Consciente? Vota con tu nivel de certeza.`

  const votes = Number(location.total_votes ?? 0)
  const score = location.conscious_score as number | string | null
  const scoreNum = score == null ? null : Number(score)
  const socialDesc =
    scoreNum != null && votes >= 10
      ? `Conscious Score ${scoreNum.toFixed(1)}/10 · ${votes} votos. ¿Tú qué opinas?`
      : votes > 0
        ? `${votes} ${votes === 1 ? 'voto' : 'votos'}. ¿Es un Lugar Consciente? Vota tú también.`
        : desc

  const ogImage = `${SITE_URL}/api/og/location/${encodeURIComponent(slug)}`
  const canonical = `${SITE_URL}/locations/${encodeURIComponent(slug)}`

  return {
    title,
    description: socialDesc,
    alternates: { canonical },
    openGraph: {
      title,
      description: socialDesc,
      url: canonical,
      siteName: 'Crowd Conscious',
      images: [{ url: ogImage, width: 1200, height: 630, alt: location.name }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: socialDesc,
      images: [ogImage],
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
