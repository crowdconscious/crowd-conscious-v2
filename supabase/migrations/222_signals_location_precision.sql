-- Migration 222 — Citizen Signals street-level location precision
--
-- The Citizen Signals compose wizard previously asked for one
-- `conscious_location_id` and let users pick anything in CDMX — alcaldías
-- and partner spots all mixed in a single flat dropdown. That made it
-- impossible to file a signal that says "excessive cables on Calle Tonalá
-- between Yucatán y Mérida": the user had to pick "Cuauhtémoc" and dump
-- the street into the body, where the moderation queue and grouping
-- logic couldn't see it.
--
-- This migration introduces a two-tier model on the SAME `citizen_signals`
-- row:
--   * `conscious_location_id`   — always the alcaldía (broad bucket).
--                                 Required; the wizard enforces this.
--   * `partner_location_id`     — optional, points to ANOTHER
--                                 `conscious_locations` row inside that
--                                 alcaldía (e.g. "Acapulco Vintage Store").
--   * `street_reference`        — optional free text the citizen types
--                                 ("Calle Tonalá entre Yucatán y Mérida").
--                                 NOT geocoded; user-attested.
--   * `precise_latitude` /
--     `precise_longitude`       — reserved for the Phase 2 map-pin UI.
--                                 Columns added now so we don't need a
--                                 second migration when the picker ships.
--
-- A signal may carry AT MOST ONE of {partner_location_id, street_reference}.
-- Picking both is a UX error (an admin would have to reconcile them). We
-- enforce that with a CHECK constraint AND in the POST /api/signals zod
-- validator so a malformed client can't silently land mismatched rows.
--
-- Public view: `citizen_signals_public` is re-created to expose
-- partner_location_id and street_reference. lat/lng stay moderator-only
-- (they don't render anywhere in MVP and we want UX in place — privacy
-- warning, pin precision, opt-in — before showing them to the public).
--
-- Reminder: after applying this migration, regenerate the typed
-- Database['Tables']['citizen_signals'] + Database['Views']
-- ['citizen_signals_public'] shapes (we keep the types hand-curated in
-- `types/database.ts`; the matching edits ship in this same PR).
--
-- Index: a partial index on partner_location_id supports the future
-- "show all signals filed at this partner spot" query path. We keep it
-- partial so it stays tiny — most rows will have a NULL value.
--
-- Rollback (do not run in production without backup):
--   DROP INDEX IF EXISTS public.idx_citizen_signals_partner_location;
--   ALTER TABLE public.citizen_signals
--     DROP CONSTRAINT IF EXISTS citizen_signals_one_refinement;
--   ALTER TABLE public.citizen_signals
--     DROP COLUMN IF EXISTS partner_location_id,
--     DROP COLUMN IF EXISTS street_reference,
--     DROP COLUMN IF EXISTS precise_latitude,
--     DROP COLUMN IF EXISTS precise_longitude;
--   -- Then re-run the citizen_signals_public CREATE OR REPLACE VIEW from
--   -- migration 221 to restore the pre-precision projection.

-- =============================================================================
-- 1. Columns on citizen_signals
-- =============================================================================

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS partner_location_id uuid
    REFERENCES public.conscious_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS street_reference text,
  ADD COLUMN IF NOT EXISTS precise_latitude double precision,
  ADD COLUMN IF NOT EXISTS precise_longitude double precision;

COMMENT ON COLUMN public.citizen_signals.partner_location_id IS
  'Optional refinement of conscious_location_id. Points at a non-alcaldía conscious_locations row (e.g. a partner spot) that lives geographically inside the parent alcaldía. Mutually exclusive with street_reference.';

COMMENT ON COLUMN public.citizen_signals.street_reference IS
  'Optional citizen-typed street / intersection / landmark inside the parent alcaldía (e.g. "Calle Tonalá entre Yucatán y Mérida"). Free text 3-160 chars, NOT geocoded. Mutually exclusive with partner_location_id.';

COMMENT ON COLUMN public.citizen_signals.precise_latitude IS
  'Reserved for the Phase 2 map-pin UI. Citizens drop a pin and we store the WGS84 lat here. NULL until the picker ships; not surfaced via citizen_signals_public yet.';

COMMENT ON COLUMN public.citizen_signals.precise_longitude IS
  'Reserved for the Phase 2 map-pin UI. See precise_latitude.';

COMMENT ON TABLE public.citizen_signals IS
  'Citizen-authored civic signal. conscious_location_id is the broad alcaldía bucket; partner_location_id OR street_reference is the optional precise spot (mutually exclusive); precise_latitude/longitude reserved for the Phase 2 map-pin picker. Public reads via citizen_signals_public view only.';

-- =============================================================================
-- 2. Mutual-exclusivity CHECK
-- =============================================================================
--
-- num_nonnulls is a built-in (Postgres 9.5+) and behaves like COUNT() over
-- the arg list. <= 1 means: zero refinement OR exactly one. Both set at
-- once is rejected at the DB layer regardless of how the row arrived.

ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_one_refinement;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_one_refinement
    CHECK (num_nonnulls(partner_location_id, street_reference) <= 1);

-- =============================================================================
-- 3. Partial index for partner_location_id
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_citizen_signals_partner_location
  ON public.citizen_signals(partner_location_id)
  WHERE partner_location_id IS NOT NULL;

-- =============================================================================
-- 4. Re-create citizen_signals_public to expose the refinement fields
-- =============================================================================
--
-- IMPORTANT: CREATE OR REPLACE VIEW only allows APPENDING new columns at
-- the end of the SELECT list (Postgres 42P16). The pre-existing column
-- order locked in by migration 219 and the 221 fix-up must therefore be
-- preserved verbatim; partner_location_id and street_reference are
-- appended AFTER anonymous_support_count.
--
-- We intentionally do NOT expose precise_latitude / precise_longitude
-- here. Those columns are reserved for a future map-pin UX that needs a
-- privacy review (lat/lng on a citizen-filed report can de-anonymise
-- households) before being rendered. The moderator dashboard reads
-- against citizen_signals directly and can show them today.

CREATE OR REPLACE VIEW public.citizen_signals_public AS
SELECT
  cs.id,
  cs.public_slug,
  cs.post_type,
  cs.category,
  cs.severity,
  cs.target_kind,
  cs.citizen_target_id,
  cs.title,
  cs.body,
  cs.language,
  cs.conscious_location_id,
  CASE WHEN cs.anonymous_display_mode THEN cs.anonymous_display_name ELSE NULL END AS display_name,
  cs.anonymous_display_mode,
  cs.threshold_stage,
  cs.cosign_count,
  cs.stage1_met_at,
  cs.stage2_met_at,
  cs.created_at,
  cs.updated_at,
  cs.anonymous_support_count,
  cs.partner_location_id,
  cs.street_reference
FROM public.citizen_signals cs
WHERE cs.publication_status = 'published';

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Exposes the broad alcaldía (conscious_location_id) plus optional refinement (partner_location_id OR street_reference). precise_latitude/longitude intentionally omitted until the map-pin UX ships.';

GRANT SELECT ON public.citizen_signals_public TO anon, authenticated;
