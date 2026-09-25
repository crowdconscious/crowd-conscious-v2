-- Migration 265 — Reconocimientos moderation fields + intake views
--
-- Run AFTER 263_recognitions.sql and 264_recognition_events.sql.
--
-- Adds:
--   - reject_reason preset codes + optional reject_detail
--   - admin_notes (DM consent, internal only — never public)
--   - src default → 'unknown' when missing
--   - intake_view events (nullable recognition_id)
--   - weekly stats: rejects by reason, views by src, submissions by src
--
-- Rollback:
--   DROP VIEW IF EXISTS public.recognitions_weekly_stats;
--   -- then recreate 264 view; drop new columns / restore event check as needed.

-- =============================================================================
-- 1. Reject presets + detail + admin notes
-- =============================================================================

ALTER TABLE public.recognitions
  ADD COLUMN IF NOT EXISTS reject_detail text
    CHECK (reject_detail IS NULL OR char_length(reject_detail) <= 500);

ALTER TABLE public.recognitions
  ADD COLUMN IF NOT EXISTS admin_notes text
    CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 2000);

COMMENT ON COLUMN public.recognitions.reject_detail IS
  'Optional free-text detail alongside reject_reason preset code. Admin only.';

COMMENT ON COLUMN public.recognitions.admin_notes IS
  'Internal Social notes (e.g. DM consent "Acepto"). Never expose publicly.';

-- Normalize any free-text reject_reason values before applying the preset check.
UPDATE public.recognitions
SET reject_reason = 'otro'
WHERE reject_reason IS NOT NULL
  AND reject_reason NOT IN (
    'promo',
    'selfie',
    'autonominacion',
    'menores',
    'queja_senal',
    'politica',
    'otro'
  );

-- Drop any existing CHECK on reject_reason (inline or named) before re-adding the preset check.
DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.recognitions'::regclass
      AND c.contype = 'c'
      AND a.attname = 'reject_reason'
  LOOP
    EXECUTE format('ALTER TABLE public.recognitions DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;

ALTER TABLE public.recognitions
  ADD CONSTRAINT recognitions_reject_reason_check
  CHECK (
    reject_reason IS NULL
    OR reject_reason IN (
      'promo',
      'selfie',
      'autonominacion',
      'menores',
      'queja_senal',
      'politica',
      'otro'
    )
  );

-- =============================================================================
-- 2. src default → unknown (web entry still passes src=web explicitly)
-- =============================================================================

ALTER TABLE public.recognitions
  ALTER COLUMN src SET DEFAULT 'unknown';

-- =============================================================================
-- 3. recognition_events: nullable recognition_id + intake_view
-- =============================================================================

ALTER TABLE public.recognition_events
  ALTER COLUMN recognition_id DROP NOT NULL;

-- Recreate event_type check to include intake_view.
ALTER TABLE public.recognition_events
  DROP CONSTRAINT IF EXISTS recognition_events_event_type_check;

ALTER TABLE public.recognition_events
  ADD CONSTRAINT recognition_events_event_type_check
  CHECK (event_type IN (
    'share_whatsapp',
    'share_native',
    'share_copy',
    'card_download_portrait',
    'card_download_story',
    'intake_view'
  ));

-- intake_view rows must not point at a recognition; share/download rows must.
ALTER TABLE public.recognition_events
  DROP CONSTRAINT IF EXISTS recognition_events_intake_view_id_check;

ALTER TABLE public.recognition_events
  ADD CONSTRAINT recognition_events_intake_view_id_check
  CHECK (
    (event_type = 'intake_view' AND recognition_id IS NULL)
    OR (event_type <> 'intake_view' AND recognition_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_recognition_events_intake_view_src
  ON public.recognition_events (src, created_at DESC)
  WHERE event_type = 'intake_view';

COMMENT ON TABLE public.recognition_events IS
  'Internal Reconocimientos events (shares, card downloads, intake views). Never public.';

-- =============================================================================
-- 4. Weekly stats view — submissions, rejects by reason, events (incl. views)
-- =============================================================================

CREATE OR REPLACE VIEW public.recognitions_weekly_stats
WITH (security_invoker = true)
AS
WITH submissions AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    src,
    status,
    count(*)::int AS submissions
  FROM public.recognitions
  GROUP BY 1, 2, 3
),
rejects AS (
  SELECT
    date_trunc('week', coalesce(reviewed_at, created_at))::date AS week_start,
    reject_reason,
    count(*)::int AS rejects
  FROM public.recognitions
  WHERE status = 'rejected'
    AND reject_reason IS NOT NULL
  GROUP BY 1, 2
),
events AS (
  SELECT
    date_trunc('week', e.created_at)::date AS week_start,
    e.src,
    e.event_type,
    count(*)::int AS events
  FROM public.recognition_events e
  GROUP BY 1, 2, 3
)
SELECT
  coalesce(s.week_start, r.week_start, e.week_start) AS week_start,
  s.src,
  s.status,
  coalesce(s.submissions, 0) AS submissions,
  r.reject_reason,
  coalesce(r.rejects, 0) AS rejects,
  e.event_type,
  e.src AS event_src,
  coalesce(e.events, 0) AS events
FROM submissions s
FULL OUTER JOIN rejects r
  ON s.week_start = r.week_start
FULL OUTER JOIN events e
  ON coalesce(s.week_start, r.week_start) = e.week_start;

COMMENT ON VIEW public.recognitions_weekly_stats IS
  'Admin/service-role weekly Reconocimientos scorecard: submissions by src/status, rejects by reason, events (incl. intake_view) by src. Not for anon.';

-- =============================================================================
-- 5. Strategist weekly queries (copy into PR / weekly ritual)
-- =============================================================================
-- -- A) Intake views vs submissions by src (conversion)
-- SELECT
--   date_trunc('week', created_at)::date AS week_start,
--   src,
--   count(*) FILTER (WHERE event_type = 'intake_view') AS views,
--   (SELECT count(*) FROM public.recognitions r
--     WHERE r.src = e.src
--       AND r.created_at >= date_trunc('week', now())) AS submissions
-- FROM public.recognition_events e
-- WHERE e.created_at >= date_trunc('week', now())
-- GROUP BY 1, 2
-- ORDER BY 1 DESC, 2;
--
-- -- B) Rejects by reason this ISO week
-- SELECT
--   reject_reason,
--   count(*)::int AS rejects
-- FROM public.recognitions
-- WHERE status = 'rejected'
--   AND coalesce(reviewed_at, created_at) >= date_trunc('week', now())
-- GROUP BY 1
-- ORDER BY rejects DESC;
