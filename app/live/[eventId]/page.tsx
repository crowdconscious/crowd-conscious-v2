import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { getLiveEventTitle } from '@/lib/live-event-title'
import { LiveMatchClient } from './LiveMatchClient'
import { SITE_URL } from '@/lib/seo/site'

const BASE = SITE_URL

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

  const canonical = `${BASE}/live/${eventId}`

  return {
    title: `${title} | Conscious Live`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, alt: title }],
      type: 'website',
      url: canonical,
      siteName: 'Crowd Conscious',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical,
      languages: {
        'es-MX': canonical,
        'en-US': canonical,
      },
    },
  }
}

export default async function LiveEventMatchPage({ params }: Props) {
  const { eventId } = await params
  return <LiveMatchClient eventId={eventId} />
}
