import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { getLiveEventTitle } from '@/lib/live-event-title'
import { LiveMatchClient } from './LiveMatchClient'
import { SITE_URL } from '@/lib/seo/site'

const BASE = SITE_URL

function absoluteOgImage(url: string | null | undefined): string {
  if (!url) return `${BASE}/images/favicon-512.png`
  if (url.startsWith('http')) return url
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

const STATUS_LABEL: Record<string, { es: string; en: string }> = {
  scheduled: { es: 'Programado', en: 'Scheduled' },
  live: { es: 'En vivo', en: 'Live' },
  completed: { es: 'Finalizado', en: 'Completed' },
  cancelled: { es: 'Cancelado', en: 'Cancelled' },
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
  const sessionProfile = await getCurrentUser()
  const isAdmin = isAdminUser(sessionProfile)

  // Short SSR summary so agents / no-JS clients see title + status in raw HTML
  // (the interactive shell remains LiveMatchClient).
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('live_events')
    .select(
      'title, description, translations, status, match_date, event_type, sponsor_name'
    )
    .eq('id', eventId)
    .maybeSingle()

  const title = event ? getLiveEventTitle(event, 'es') : 'Conscious Live'
  const statusKey = event?.status ?? 'scheduled'
  const statusLabel = STATUS_LABEL[statusKey]?.es ?? statusKey
  const description =
    event?.description?.trim() ||
    'Evento en vivo de Crowd Conscious — predicciones y consultas en tiempo real.'

  return (
    <>
      <section className="border-b border-slate-800 bg-[#0b1017] px-4 py-6 text-slate-100">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
            Conscious Live
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Estado: {statusLabel}
            {event?.match_date
              ? ` · ${new Date(event.match_date).toLocaleString('es-MX', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`
              : ''}
            {event?.sponsor_name ? ` · Con el apoyo de ${event.sponsor_name}` : ''}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
      </section>
      <LiveMatchClient eventId={eventId} isAdmin={isAdmin} />
    </>
  )
}
