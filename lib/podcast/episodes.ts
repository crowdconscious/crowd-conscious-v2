/**
 * Static podcast episode catalog (Phase 1).
 *
 * Add episode 2+ here — no CMS yet. Keep share URLs clean (no tracking
 * params); embed helpers strip them if a future entry includes any.
 */

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
  youtube: {
    /** youtu.be / watch share URL without tracking params */
    shareUrl: string
    videoId: string
  }
  spotify: {
    /** open.spotify.com/episode share URL without tracking params */
    shareUrl: string
    episodeId: string
  }
}

export const PODCAST_EPISODES: PodcastEpisode[] = [
  {
    slug: 'tocayos-ep-1-la-ia-nos-conoce',
    number: 1,
    publishedAt: '2026-09-01',
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

export function getPodcastEpisodes(): PodcastEpisode[] {
  return PODCAST_EPISODES
}

export function getLatestPodcastEpisode(): PodcastEpisode | undefined {
  return PODCAST_EPISODES[0]
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
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
