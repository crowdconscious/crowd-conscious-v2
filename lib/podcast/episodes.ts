/**
 * Podcast episode catalog. Prefers live rows from `podcast_episodes`
 * (migration 279); falls back to the static array when the query fails
 * or returns nothing. Caching lives here because `/podcast` reads
 * cookies() and is therefore dynamic — `export const revalidate` alone
 * would not help.
 */

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export type PodcastLocale = 'es' | 'en'

export type PodcastEpisode = {
  /** Stable slug for deep links / future /podcast/[slug] */
  slug: string
  /** Episode number shown in UI (1-based) */
  number: number
  /** ISO date (YYYY-MM-DD) for display + sitemap freshness */
  publishedAt: string
  title: { es: string; en: string }
  /** Short listing blurb */
  blurb: { es: string; en: string }
  /** Cover art URL (Spotify/YouTube CDN or /public path). Optional. */
  coverImageUrl?: string
  /** Width/height ratio from DB (e.g. 16/9). Defaults to square when omitted. */
  coverAspectRatio?: number
  youtube?: {
    /** youtu.be / watch share URL without tracking params */
    shareUrl: string
    videoId: string
  }
  spotify?: {
    /** open.spotify.com/episode share URL without tracking params */
    shareUrl: string
    episodeId: string
  }
}

type PodcastEpisodeRow = {
  slug: string
  number: number | null
  published_at: string
  title_es: string | null
  title_en: string | null
  blurb_es: string | null
  blurb_en: string | null
  cover_image_url: string | null
  cover_aspect_ratio: number | string | null
  youtube_video_id: string | null
  spotify_episode_id: string | null
}

/** Static fallback — keep in sync with migration 279 seed rows. Newest first. */
export const PODCAST_EPISODES: PodcastEpisode[] = [
  {
    slug: 'tocayos-ep-2-mexico-por-el-clima',
    number: 2,
    publishedAt: '2026-09-29',
    title: {
      es: 'México por el Clima, con Álvaro Zavala y Juan Pablo Beltrán — TOCAYOS Ep. 2',
      en: 'México por el Clima, with Álvaro Zavala and Juan Pablo Beltrán — TOCAYOS Ep. 2',
    },
    blurb: {
      es: 'Conversamos con Álvaro Zavala, cofundador de México por el Clima, y Juan Pablo Beltrán, concejal de Miguel Hidalgo: qué pueden hacer las alcaldías frente al clima, la Semana de Acción (5–9 oct) y los Pulsos de agua y basura.',
      en: 'We talk with Álvaro Zavala, co-founder of México por el Clima, and Juan Pablo Beltrán, Miguel Hidalgo councilor: what city halls can do about climate, Climate Action Week (Oct 5–9), and the water and waste Pulses.',
    },
    coverImageUrl:
      'https://image-cdn-fa.spotifycdn.com/image/ab6772ab000015beb2b9afa64b2d2abaaf7a2e82',
    coverAspectRatio: 16 / 9,
    youtube: {
      shareUrl: 'https://youtu.be/Npgi-e5HEWY',
      videoId: 'Npgi-e5HEWY',
    },
    spotify: {
      shareUrl: 'https://open.spotify.com/episode/7jUYMUtn3PWu8pDUQ5YYPG',
      episodeId: '7jUYMUtn3PWu8pDUQ5YYPG',
    },
  },
  {
    slug: 'tocayos-ep-1-la-ia-nos-conoce',
    number: 1,
    publishedAt: '2026-09-15',
    title: {
      es: '¿La IA nos conoce? — TOCAYOS Ep. 1',
      en: 'Does AI know us? — TOCAYOS Ep. 1',
    },
    blurb: {
      es: 'El episodio piloto de TOCAYOS: inteligencia artificial, identidad y cómo escucharnos mejor en la era de los datos — un programa de Crowd Conscious.',
      en: 'The TOCAYOS pilot: artificial intelligence, identity, and listening better in the data age — a Crowd Conscious show.',
    },
    coverImageUrl:
      'https://image-cdn-ak.spotifycdn.com/image/ab6772ab000015be4e6ca9686b4184e40520f56a',
    coverAspectRatio: 1,
    youtube: {
      shareUrl: 'https://youtu.be/wtsLEEY43wY',
      videoId: 'wtsLEEY43wY',
    },
    spotify: {
      shareUrl: 'https://open.spotify.com/episode/1d7biRZuoA20gpuxuwJEM6',
      episodeId: '1d7biRZuoA20gpuxuwJEM6',
    },
  },
]

function mapRow(row: PodcastEpisodeRow): PodcastEpisode {
  const titleEs = row.title_es ?? ''
  const blurbEs = row.blurb_es ?? ''
  const youtubeId = row.youtube_video_id
  const spotifyId = row.spotify_episode_id
  const aspect =
    row.cover_aspect_ratio == null || row.cover_aspect_ratio === ''
      ? undefined
      : Number(row.cover_aspect_ratio)

  return {
    slug: row.slug,
    number: row.number ?? 0,
    publishedAt: row.published_at,
    title: {
      es: titleEs,
      en: row.title_en ?? titleEs,
    },
    blurb: {
      es: blurbEs,
      en: row.blurb_en ?? blurbEs,
    },
    ...(row.cover_image_url ? { coverImageUrl: row.cover_image_url } : {}),
    ...(aspect != null && Number.isFinite(aspect) ? { coverAspectRatio: aspect } : {}),
    ...(youtubeId
      ? {
          youtube: {
            shareUrl: `https://youtu.be/${youtubeId}`,
            videoId: youtubeId,
          },
        }
      : {}),
    ...(spotifyId
      ? {
          spotify: {
            shareUrl: `https://open.spotify.com/episode/${spotifyId}`,
            episodeId: spotifyId,
          },
        }
      : {}),
  }
}

async function fetchPublishedEpisodes(): Promise<PodcastEpisode[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return PODCAST_EPISODES

  // Cookie-less anon client — safe inside unstable_cache (no request cookies).
  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select(
      'slug, number, published_at, title_es, title_en, blurb_es, blurb_en, cover_image_url, cover_aspect_ratio, youtube_video_id, spotify_episode_id'
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .order('number', { ascending: false })

  if (error || !data || data.length === 0) return PODCAST_EPISODES
  return (data as PodcastEpisodeRow[]).map(mapRow)
}

export const getPodcastEpisodes = unstable_cache(
  async (): Promise<PodcastEpisode[]> => {
    try {
      return await fetchPublishedEpisodes()
    } catch {
      return PODCAST_EPISODES
    }
  },
  ['podcast-episodes'],
  { revalidate: 300, tags: ['podcast-episodes'] }
)

export async function getLatestPodcastEpisode(): Promise<PodcastEpisode | undefined> {
  const episodes = await getPodcastEpisodes()
  return episodes[0]
}

/** Prefer privacy-enhanced domain; same videoId as youtube.com/embed. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}

export function spotifyEmbedUrl(episodeId: string): string {
  return `https://open.spotify.com/embed/episode/${episodeId}`
}

export function episodeTitle(ep: PodcastEpisode, locale: PodcastLocale): string {
  return locale === 'en' ? ep.title.en : ep.title.es
}

export function episodeBlurb(ep: PodcastEpisode, locale: PodcastLocale): string {
  return locale === 'en' ? ep.blurb.en : ep.blurb.es
}
