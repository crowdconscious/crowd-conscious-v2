import type { PodcastLocale } from '@/lib/podcast/episodes'

/**
 * Hub UI copy for /podcast. Episode titles/blurbs live in
 * lib/podcast/episodes.ts so adding Ep. 2 does not touch this module.
 */
export function getPodcastCopy(locale: PodcastLocale) {
  const es = locale === 'es'
  return {
    metaTitle: es ? 'Podcast | TOCAYOS' : 'Podcast | TOCAYOS',
    metaDescription: es
      ? 'Escucha TOCAYOS, el podcast de Crowd Conscious. Episodio 1 gratis en YouTube y Spotify — escuchar apoya causas vía el Fondo Consciente.'
      : 'Listen to TOCAYOS, the Crowd Conscious podcast. Episode 1 free on YouTube and Spotify — listening supports causes via the Conscious Fund.',
    /** OG/twitter titles include brand (no layout title template). */
    ogTitle: es
      ? 'Podcast | TOCAYOS — Crowd Conscious'
      : 'Podcast | TOCAYOS — Crowd Conscious',
    eyebrow: es ? 'Podcast' : 'Podcast',
    hubTitle: es ? 'TOCAYOS' : 'TOCAYOS',
    hubSubtitle: es
      ? 'Conversaciones sobre consciencia colectiva, tecnología y lo que importa en México.'
      : 'Conversations on collective consciousness, technology, and what matters in Mexico.',
    episodeLabel: (n: number) => (es ? `Episodio ${n}` : `Episode ${n}`),
    listenYoutube: es ? 'Ver en YouTube' : 'Watch on YouTube',
    listenSpotify: es ? 'Escuchar en Spotify' : 'Listen on Spotify',
    youtubeEmbedTitle: es ? 'Reproductor de YouTube' : 'YouTube player',
    spotifyEmbedTitle: es ? 'Reproductor de Spotify' : 'Spotify player',
    fundLine: es
      ? 'Escuchar apoya causas reales a través del Fondo Consciente.'
      : 'Listening supports real causes through the Conscious Fund.',
    fundCta: es ? 'Conoce el Fondo' : 'About the Fund',
    // Landing teaser
    teaserEyebrow: es ? 'Podcast' : 'Podcast',
    teaserTitle: es
      ? 'TOCAYOS Ep. 1 — ¿La IA nos conoce?'
      : 'TOCAYOS Ep. 1 — Does AI know us?',
    teaserBody: es
      ? 'Escucha el piloto gratis en YouTube o Spotify. Escuchar apoya causas vía el Fondo Consciente.'
      : 'Listen to the pilot free on YouTube or Spotify. Listening supports causes via the Conscious Fund.',
    teaserCta: es ? 'Ir al podcast' : 'Go to podcast',
  }
}
