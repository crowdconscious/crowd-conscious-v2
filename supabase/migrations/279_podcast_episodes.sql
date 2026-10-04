-- 279: TOCAYOS podcast episodes catalog (replaces hardcoded arrays in web + mobile).
-- Additive + idempotent. Public read of published rows only (anon + authenticated).
-- No INSERT/UPDATE/DELETE policies: writes go through service role / SQL only.
-- Seeds Ep. 1 and Ep. 2 (copied verbatim from lib/podcast/episodes.ts) with ON CONFLICT (slug) DO NOTHING.

CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text        NOT NULL UNIQUE,
  show               text        NOT NULL DEFAULT 'tocayos',
  number             int,
  published_at       date        NOT NULL,
  title_es           text,
  title_en           text,
  blurb_es           text,
  blurb_en           text,
  cover_image_url    text,
  cover_aspect_ratio numeric     DEFAULT 1,
  youtube_video_id   text,
  spotify_episode_id text,
  is_published       boolean     NOT NULL DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS podcast_episodes_published_idx
  ON public.podcast_episodes (is_published, published_at DESC);

-- Shared helper public.update_updated_at_column() already exists in this project.
DROP TRIGGER IF EXISTS trg_podcast_episodes_updated_at ON public.podcast_episodes;
CREATE TRIGGER trg_podcast_episodes_updated_at
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS podcast_episodes_public_read ON public.podcast_episodes;
CREATE POLICY podcast_episodes_public_read
  ON public.podcast_episodes
  FOR SELECT
  TO anon, authenticated
  USING (is_published);

-- Supabase default privileges grant ALL on new public tables to anon/authenticated;
-- strip that so clients are read-only even at the GRANT level (RLS is the second wall).
REVOKE ALL ON TABLE public.podcast_episodes FROM anon, authenticated;
GRANT SELECT ON TABLE public.podcast_episodes TO anon, authenticated;

COMMENT ON TABLE public.podcast_episodes IS
  'Migration 279: podcast episode catalog (TOCAYOS). Public read of is_published rows; writes via service role / SQL only.';

INSERT INTO public.podcast_episodes
  (slug, show, number, published_at, title_es, title_en, blurb_es, blurb_en,
   cover_image_url, cover_aspect_ratio, youtube_video_id, spotify_episode_id, is_published)
VALUES
  (
    'tocayos-ep-2-mexico-por-el-clima', 'tocayos', 2, DATE '2026-09-29',
    'México por el Clima, con Álvaro Zavala y Juan Pablo Beltrán — TOCAYOS Ep. 2',
    'México por el Clima, with Álvaro Zavala and Juan Pablo Beltrán — TOCAYOS Ep. 2',
    'Conversamos con Álvaro Zavala, cofundador de México por el Clima, y Juan Pablo Beltrán, concejal de Miguel Hidalgo: qué pueden hacer las alcaldías frente al clima, la Semana de Acción (5–9 oct) y los Pulsos de agua y basura.',
    'We talk with Álvaro Zavala, co-founder of México por el Clima, and Juan Pablo Beltrán, Miguel Hidalgo councilor: what city halls can do about climate, Climate Action Week (Oct 5–9), and the water and waste Pulses.',
    'https://image-cdn-fa.spotifycdn.com/image/ab6772ab000015beb2b9afa64b2d2abaaf7a2e82',
    16.0 / 9, 'Npgi-e5HEWY', '7jUYMUtn3PWu8pDUQ5YYPG', true
  ),
  (
    'tocayos-ep-1-la-ia-nos-conoce', 'tocayos', 1, DATE '2026-09-15',
    '¿La IA nos conoce? — TOCAYOS Ep. 1',
    'Does AI know us? — TOCAYOS Ep. 1',
    'El episodio piloto de TOCAYOS: inteligencia artificial, identidad y cómo escucharnos mejor en la era de los datos — un programa de Crowd Conscious.',
    'The TOCAYOS pilot: artificial intelligence, identity, and listening better in the data age — a Crowd Conscious show.',
    'https://image-cdn-ak.spotifycdn.com/image/ab6772ab000015be4e6ca9686b4184e40520f56a',
    1, 'wtsLEEY43wY', '1d7biRZuoA20gpuxuwJEM6', true
  )
ON CONFLICT (slug) DO NOTHING;
