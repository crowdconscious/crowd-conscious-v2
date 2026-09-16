import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  episodeBlurb,
  episodeTitle,
  getPodcastEpisodes,
  spotifyEmbedUrl,
  youtubeEmbedUrl,
} from '@/lib/podcast/episodes'
import { getPodcastCopy } from '@/lib/i18n/podcast'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Podcast | TOCAYOS',
  description:
    'Escucha TOCAYOS, el podcast de Crowd Conscious. Episodio 1 gratis en YouTube y Spotify — escuchar apoya causas vía el Fondo Consciente.',
  alternates: { canonical: `${SITE_URL}/podcast` },
  openGraph: {
    title: 'Podcast | TOCAYOS — Crowd Conscious',
    description:
      'Escucha TOCAYOS Ep. 1 gratis en YouTube y Spotify. Escuchar apoya causas vía el Fondo Consciente.',
    url: `${SITE_URL}/podcast`,
    type: 'website',
  },
}

function formatEpisodeDate(iso: string, locale: 'en' | 'es') {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function PodcastPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const copy = getPodcastCopy(locale)
  const episodes = getPodcastEpisodes()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          {copy.hubTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">{copy.hubSubtitle}</p>
        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500">
          {copy.fundLine}{' '}
          <Link
            href="/predictions/fund"
            className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            {copy.fundCta}
          </Link>
        </p>
      </header>

      <ul className="space-y-10">
        {episodes.map((ep) => {
          const title = episodeTitle(ep, locale)
          const blurb = episodeBlurb(ep, locale)
          return (
            <li
              key={ep.slug}
              id={ep.slug}
              className="overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
                {ep.coverImageUrl ? (
                  <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-lg sm:mx-0">
                    <Image
                      src={ep.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="160px"
                      priority={ep.number === 1}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {copy.episodeLabel(ep.number)} · {formatEpisodeDate(ep.publishedAt, locale)}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-white md:text-2xl">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{blurb}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                    <a
                      href={ep.youtube.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-[#2d3748] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-white"
                    >
                      {copy.listenYoutube}
                    </a>
                    <a
                      href={ep.spotify.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-[#2d3748] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-white"
                    >
                      {copy.listenSpotify}
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-[#2d3748] px-5 py-5 sm:px-6">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
                  <iframe
                    title={`${copy.youtubeEmbedTitle}: ${title}`}
                    src={youtubeEmbedUrl(ep.youtube.videoId)}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
                  <iframe
                    title={`${copy.spotifyEmbedTitle}: ${title}`}
                    src={spotifyEmbedUrl(ep.spotify.episodeId)}
                    className="h-[152px] w-full border-0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
