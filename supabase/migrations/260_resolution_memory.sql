-- Phase 2 — resolution memory (UX overhaul §3.5 / §5 / §6.4)
--
-- 1. silence_published_at on citizen_signals — stamped when 30 days pass
--    after stage 1 with no official response (public record of silence).
-- 2. resolution_notify_log — thin notify ledger for idempotency + max
--    one resolution notification per user per day. Service role only.
-- 3. Widen notifications.type for resolution event mirrors.
-- 4. Append silence_published_at to citizen_signals_public (view append only).
--
-- Do NOT invent a second action ledger for votes/co-signs/evaluations —
-- those stay in market_votes / citizen_signal_cosigns / etc. (§6.4).

-- =============================================================================
-- 1. Silence as published result
-- =============================================================================

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS silence_published_at timestamptz;

COMMENT ON COLUMN public.citizen_signals.silence_published_at IS
  'When set, institutional silence is a published public-record result (stage1_met_at + 30d, no citizen_signal_responses). Stamped once by the resolution silence cron.';

CREATE INDEX IF NOT EXISTS idx_citizen_signals_silence_pending
  ON public.citizen_signals (stage1_met_at)
  WHERE silence_published_at IS NULL
    AND threshold_stage >= 1
    AND publication_status = 'published';

-- =============================================================================
-- 2. resolution_notify_log (service-role notify ledger)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.resolution_notify_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trigger text NOT NULL
    CHECK (trigger IN (
      'signal_stage_50',
      'signal_stage_200',
      'signal_official_response',
      'signal_silence_30d',
      'pulse_close',
      'location_certified'
    )),
  object_type text NOT NULL
    CHECK (object_type IN ('signal', 'pulse', 'location')),
  object_id uuid NOT NULL,
  channel text NOT NULL
    CHECK (channel IN ('push', 'email', 'in_app_only')),
  days_since_action integer,
  sent_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.resolution_notify_log IS
  'Phase 2 resolution hook send log. Idempotent per (user, trigger, object); enforces max one resolution notify per user per UTC day. Service role only — no public policies.';

-- One notify per user per resolution event (idempotent re-runs).
CREATE UNIQUE INDEX IF NOT EXISTS uq_resolution_notify_user_trigger_object
  ON public.resolution_notify_log (user_id, trigger, object_id);

-- Max one resolution notification per user per UTC calendar day.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resolution_notify_user_utc_day
  ON public.resolution_notify_log (
    user_id,
    ((sent_at AT TIME ZONE 'UTC')::date)
  );

ALTER TABLE public.resolution_notify_log ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — intentional. Cron + resolution hook
-- use the service-role client which bypasses RLS.

-- =============================================================================
-- 3. notifications.type — resolution mirrors
-- =============================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- legacy types (134/146)
      'market_resolved',
      'inbox_upvote',
      'xp_earned',
      'fund_vote_available',
      'daily_market_digest',
      'vote_confirmation',
      'reengagement_weekly',
      -- push-mirrored types (247)
      'pulse_published',
      'pulse_vote_invite',
      'pulse_resolved',
      'blog_published',
      'signal_cosign_invite',
      'signal_milestone',
      'location_published',
      -- Phase 2 resolution types (260)
      'signal_stage_50',
      'signal_stage_200',
      'signal_official_response',
      'signal_silence_30d',
      'location_certified'
    )
  );

-- =============================================================================
-- 4. citizen_signals_public — append silence_published_at
-- =============================================================================
--
-- CREATE OR REPLACE VIEW only allows appending columns (42P16). Preserve
-- column order from 248_signals_expanded_targets.sql; append at end.

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
  cs.street_reference,
  cs.country_code,
  cs.city_slug,
  cs.locality,
  cs.routing_mode,
  cs.target_name,
  cs.target_location_id,
  cs.silence_published_at
FROM public.citizen_signals cs
WHERE cs.publication_status = 'published';

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Migration 260 appends silence_published_at for the public 30-day silence registry.';

GRANT SELECT ON public.citizen_signals_public TO anon, authenticated;

-- Re-issue get_signals_feed so SETOF rowtype picks up the appended column.
CREATE OR REPLACE FUNCTION public.get_signals_feed(
  p_limit  int DEFAULT 30,
  p_before timestamptz DEFAULT null
)
RETURNS SETOF public.citizen_signals_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select s.*
  from public.citizen_signals_public s
  where (p_before is null or s.created_at < p_before)
    and (
      auth.uid() is null
      or not exists (
        select 1
        from public.citizen_signals cs
        join public.user_blocks ub
          on ub.blocker_id = auth.uid()
         and ub.blocked_id = cs.author_user_id
        where cs.id = s.id
      )
    )
  order by s.created_at desc
  limit greatest(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_signals_feed(int, timestamptz)
  TO anon, authenticated;
