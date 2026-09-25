-- Migration 264 — recognition_events + weekly stats (Reconocimientos)
--
-- Internal analytics only. No anon/authenticated read.
-- Run AFTER 263_recognitions.sql.
--
-- Rollback:
--   DROP VIEW IF EXISTS public.recognitions_weekly_stats;
--   DROP TABLE IF EXISTS public.recognition_events CASCADE;

-- =============================================================================
-- 1. recognition_events
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recognition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recognition_id uuid NOT NULL
    REFERENCES public.recognitions(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'share_whatsapp',
      'share_native',
      'share_copy',
      'card_download_portrait',
      'card_download_story'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Optional attribution (e.g. web / ios). Sanitized in API. No PII / no IP.
  src text
    CHECK (src IS NULL OR src ~ '^[a-z0-9_]{1,40}$')
);

CREATE INDEX IF NOT EXISTS idx_recognition_events_recognition_created
  ON public.recognition_events (recognition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recognition_events_type_created
  ON public.recognition_events (event_type, created_at DESC);

COMMENT ON TABLE public.recognition_events IS
  'Internal Reconocimientos share/download events. Never expose publicly.';

ALTER TABLE public.recognition_events ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — service-role / admin API only.
DROP POLICY IF EXISTS recognition_events_admin_select ON public.recognition_events;
CREATE POLICY recognition_events_admin_select
  ON public.recognition_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- =============================================================================
-- 2. Weekly stats view (admin / service-role)
-- =============================================================================
-- One row per ISO week with submission counts by src and status, plus
-- share/download totals for that week. Strategist can also join per-item
-- event counts (see PR body query).

CREATE OR REPLACE VIEW public.recognitions_weekly_stats
WITH (security_invoker = true)
AS
WITH weeks AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    src,
    status,
    count(*)::int AS submissions
  FROM public.recognitions
  GROUP BY 1, 2, 3
),
events AS (
  SELECT
    date_trunc('week', e.created_at)::date AS week_start,
    e.event_type,
    count(*)::int AS events
  FROM public.recognition_events e
  GROUP BY 1, 2
)
SELECT
  coalesce(w.week_start, e.week_start) AS week_start,
  w.src,
  w.status,
  coalesce(w.submissions, 0) AS submissions,
  e.event_type,
  coalesce(e.events, 0) AS events
FROM weeks w
FULL OUTER JOIN events e
  ON w.week_start = e.week_start;

COMMENT ON VIEW public.recognitions_weekly_stats IS
  'Admin/service-role weekly Reconocimientos funnel + share metrics. Not for anon.';

-- No GRANT to anon/authenticated — readable via service role or admin RLS on base tables.

-- =============================================================================
-- 3. Strategist weekly query (run in SQL editor; service role / admin)
-- =============================================================================
-- Copy into PR body / weekly ritual. Filters to the current ISO week by default.
--
-- -- A) Submissions this ISO week by src + status
-- SELECT
--   date_trunc('week', created_at)::date AS week_start,
--   src,
--   status,
--   count(*)::int AS submissions
-- FROM public.recognitions
-- WHERE created_at >= date_trunc('week', now())
-- GROUP BY 1, 2, 3
-- ORDER BY 1 DESC, src, status;
--
-- -- B) Per approved item: shares by type + card downloads (all time or this week)
-- SELECT
--   r.id,
--   r.share_slug,
--   r.what,
--   r.src AS intake_src,
--   count(*) FILTER (WHERE e.event_type = 'share_whatsapp')::int AS share_whatsapp,
--   count(*) FILTER (WHERE e.event_type = 'share_native')::int AS share_native,
--   count(*) FILTER (WHERE e.event_type = 'share_copy')::int AS share_copy,
--   count(*) FILTER (WHERE e.event_type = 'card_download_portrait')::int AS card_portrait,
--   count(*) FILTER (WHERE e.event_type = 'card_download_story')::int AS card_story
-- FROM public.recognitions r
-- LEFT JOIN public.recognition_events e
--   ON e.recognition_id = r.id
--  AND e.created_at >= date_trunc('week', now())
-- WHERE r.status = 'approved'
-- GROUP BY r.id
-- ORDER BY r.created_at DESC;
