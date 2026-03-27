import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { getLiveEventTitle } from '@/lib/live-event-title'
import { LiveMatchClient } from './LiveMatchClient'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

function absoluteOgImage(url: string | null | undefined): string {
  if (!url) return `${BASE}/images/favicon-512.png`
  if (url.startsWith('http')) return url
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

type Props = { params: Promise<{ eventId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('live_events')
    .select('title, translations, sponsor_logo_url')
    .eq('id', eventId)
    .maybeSingle()

  const title = data ? getLiveEventTitle(data, 'en') : 'Conscious Live'
  const description = 'Make predictions live on Crowd Conscious'
  const image = absoluteOgImage(data?.sponsor_logo_url ?? null)

  return {
    title: `${title} | Conscious Live`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, alt: title }],
      type: 'website',
      url: `${BASE}/live/${eventId}`,
      siteName: 'Crowd Conscious',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function LiveEventMatchPage({ params }: Props) {
  const { eventId } = await params
  return <LiveMatchClient eventId={eventId} />
}
