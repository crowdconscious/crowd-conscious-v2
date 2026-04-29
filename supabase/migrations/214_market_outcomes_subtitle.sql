-- ============================================================
-- 214: Add structured `subtitle` to market_outcomes
-- ============================================================
-- WHY:
-- Audit (prompt 0) confirmed `market_outcomes.label` is being used
-- as a compound field — short title + a parenthetical detail (and in
-- bilingual surveys, the EN translation glued on with " / "). That
-- is why the MH Pulse renders rows like:
--
--   "Seguridad pública( Policía de proximidad, videovigilancia,
--    patrullaje en corredores turísticos / Community policing, CCTV…"
--
-- Going forward we want:
--   * label    — short title only          ("Seguridad pública")
--   * subtitle — optional one-line detail  ("Policía de proximidad…")
--   * translations.[locale] — bilingual    ({label: {es,en}, subtitle: {es,en}})
--
-- This migration ONLY adds the column + cap. It does NOT transform
-- the 9 affected legacy rows — the admin will re-edit those Pulses
-- through the upgraded form once it ships. The render layer keeps a
-- defensive fallback for any row that still has the stuffed shape.
--
-- Constraint: cap subtitle at 200 chars. The form enforces 200 too;
-- the DB check is defense in depth so a misbehaving API can't write
-- a 50KB blob into a row that's rendered in tight UI.
--
-- ROLLBACK:
--   ALTER TABLE public.market_outcomes
--     DROP CONSTRAINT IF EXISTS market_outcomes_subtitle_length_check;
--   ALTER TABLE public.market_outcomes DROP COLUMN IF EXISTS subtitle;
-- ============================================================

ALTER TABLE public.market_outcomes
  ADD COLUMN IF NOT EXISTS subtitle text;

ALTER TABLE public.market_outcomes
  DROP CONSTRAINT IF EXISTS market_outcomes_subtitle_length_check;

ALTER TABLE public.market_outcomes
  ADD CONSTRAINT market_outcomes_subtitle_length_check
  CHECK (subtitle IS NULL OR char_length(subtitle) <= 200);

COMMENT ON COLUMN public.market_outcomes.subtitle IS
  'Optional one-line detail rendered below the label in detail/result UI. Max 200 chars (enforced by check constraint and the admin form).';

-- The translations jsonb on this table currently looks like
--   { "en": { "label": "..." } }
-- Going forward it may also carry subtitle:
--   { "en": { "label": "...", "subtitle": "..." } }
-- (Spanish is the canonical column value; only non-ES locales need
-- entries here.) `lib/i18n/market-translations.ts` reads in this
-- order: translations.[locale].subtitle → subtitle column → null.
COMMENT ON COLUMN public.market_outcomes.translations IS
  'Per-locale overrides. Shape: { "[locale]": { "label"?: string, "subtitle"?: string } }. Spanish lives in the canonical `label` / `subtitle` columns; non-ES locales override here.';
