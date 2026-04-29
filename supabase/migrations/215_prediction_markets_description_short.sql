-- ============================================================
-- 215: Add `description_short` to prediction_markets
-- ============================================================
-- WHY:
-- Today the "context" we surface above the vote panel is either the
-- (long-form) `description` or nothing — so most Pulses jump straight from
-- "title" to "options + slider", which is the #1 reason votes time out
-- on mobile. We want a short, blog-quality blurb (2 sentences, ≤280 chars)
-- that the admin writes once per market and we render directly under the
-- title and above the vote UI.
--
-- This is a NEW field, not a replacement: the existing `description` is
-- still used inside the collapsible "Contexto" card below the vote
-- (alongside resolution_criteria + verification sources). description_short
-- is the elevator pitch.
--
-- We cap at 280 chars so that:
--   * it fits in two lines on mobile without overwhelming the vote area
--   * the same string is reusable as og:description / twitter description
--   * a runaway paste can't push the vote panel below the fold.
--
-- The translations jsonb on this table already carries the EN locale for
-- title / description / resolution_criteria; we extend the shape comment
-- to also recognise description_short under the same `en` key. No DDL is
-- needed for the jsonb itself — Postgres will just store the new key.
--
-- BACKFILL: none. NULL is fine; the UI renders nothing (no blank space)
-- when the column is null.
--
-- ROLLBACK:
--   ALTER TABLE public.prediction_markets
--     DROP CONSTRAINT IF EXISTS prediction_markets_description_short_length_check;
--   ALTER TABLE public.prediction_markets
--     DROP COLUMN IF EXISTS description_short;
-- ============================================================

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS description_short text;

ALTER TABLE public.prediction_markets
  DROP CONSTRAINT IF EXISTS prediction_markets_description_short_length_check;

ALTER TABLE public.prediction_markets
  ADD CONSTRAINT prediction_markets_description_short_length_check
  CHECK (description_short IS NULL OR char_length(description_short) <= 280);

COMMENT ON COLUMN public.prediction_markets.description_short IS
  'Optional 2-sentence blurb (≤280 chars) rendered between the title and the vote panel on the market / Pulse detail page. Also reused as the social card og:description. Distinct from the long-form `description` which lives inside the collapsible "Contexto" card below the vote.';

-- The translations jsonb on this table currently looks like
--   { "en": { "title": "...", "description": "...", "resolution_criteria": "..." } }
-- It can now also carry description_short:
--   { "en": { "title": "...", "description": "...", "description_short": "...",
--             "resolution_criteria": "..." } }
-- Spanish lives in the canonical columns; only non-ES locales need entries here.
COMMENT ON COLUMN public.prediction_markets.translations IS
  'Per-locale overrides. Shape: { "[locale]": { "title"?: string, "description"?: string, "description_short"?: string, "resolution_criteria"?: string } }. Spanish lives in the canonical `title` / `description` / `description_short` / `resolution_criteria` columns; non-ES locales override here.';
