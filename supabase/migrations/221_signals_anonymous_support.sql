-- Migration 221 — Citizen Signals anonymous support
--
-- Adds a friction-light "Apoyo" (support) signal on top of the existing
-- verified co-sign mechanism. Anonymous visitors can tap a heart-style
-- button once per device without creating an account; the row stores a
-- client-generated device fingerprint plus a server-hashed IP so we can
-- defend against the most obvious flooding without forcing auth.
--
-- Verified co-signs (citizen_signal_cosigns) remain the only signal that
-- counts toward the threshold cron (stage 1 = 50, stage 2 = 200). The
-- anonymous count is rendered publicly for momentum/social proof only.
--
-- Tables added:
--   citizen_signal_anonymous_supports — one row per (signal, device)
--
-- Columns added:
--   citizen_signals.anonymous_support_count int
--
-- Trigger:
--   citizen_signal_anonymous_supports_count keeps the denormalised counter
--   in sync, mirroring the existing citizen_signal_cosign_count_trigger.
--
-- View update:
--   citizen_signals_public re-created to expose anonymous_support_count.
--
-- RLS posture:
--   * Anonymous INSERT is allowed (rate-limited by the API layer).
--   * SELECT is allowed for anon/authenticated so the public detail page
--     can display the count if it ever reads the table directly. The
--     citizen_signals_public view already exposes the aggregate so this
--     is belt-and-braces.
--   * No UPDATE/DELETE policies — anon cannot tamper after the fact.
--   * Admin policy mirrors migration 219.
--
-- Rollback (do not run in production without backup):
--   DROP TRIGGER IF EXISTS citizen_signal_anonymous_supports_count
--     ON public.citizen_signal_anonymous_supports;
--   DROP FUNCTION IF EXISTS public.citizen_signal_anonymous_support_count_trigger();
--   DROP TABLE IF EXISTS public.citizen_signal_anonymous_supports CASCADE;
--   ALTER TABLE public.citizen_signals DROP COLUMN IF EXISTS anonymous_support_count;
--   -- Then re-run the citizen_signals_public CREATE OR REPLACE VIEW
--   -- from migration 219 to restore the original projection.

-- =============================================================================
-- 1. Column on citizen_signals
-- =============================================================================

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS anonymous_support_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.citizen_signals.anonymous_support_count IS
  'Denormalised counter of friction-light anonymous supports. Maintained by the citizen_signal_anonymous_supports_count trigger; do NOT write from app code.';

-- =============================================================================
-- 2. citizen_signal_anonymous_supports — one row per (signal, device)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_anonymous_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,

  -- Client-side hash of UA + timezone + screen + language. Not perfect,
  -- but it's enough to prevent the trivial "tap 50 times" case. We hold
  -- the raw hash because there's no PII to derive from it.
  device_fingerprint text NOT NULL,

  -- Server-side SHA-256(ip + SIGNALS_IP_SALT). Nullable to survive the
  -- edge case where the request arrives without an X-Forwarded-For
  -- header; in practice we always have one behind Vercel.
  ip_hash text,

  -- True while a logged-in user has agreed to promote this support into
  -- a verified co-sign but the cosign row hasn't been written yet. The
  -- API flips it back to false after the promotion succeeds. Lets us
  -- recover gracefully if the post-login redirect is interrupted.
  pending_user_promotion boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (signal_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_anonymous_supports_signal
  ON public.citizen_signal_anonymous_supports(signal_id);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_anonymous_supports_ip
  ON public.citizen_signal_anonymous_supports(ip_hash);

COMMENT ON TABLE public.citizen_signal_anonymous_supports IS
  'Friction-light anonymous supports for a Citizen Signal. Does NOT count toward escalation thresholds — verified co-signs in citizen_signal_cosigns remain the source of truth for cron Stage 1/2 transitions.';

-- =============================================================================
-- 3. Counter trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.citizen_signal_anonymous_support_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.citizen_signals
       SET anonymous_support_count = anonymous_support_count + 1,
           updated_at = now()
     WHERE id = NEW.signal_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.citizen_signals
       SET anonymous_support_count = GREATEST(anonymous_support_count - 1, 0),
           updated_at = now()
     WHERE id = OLD.signal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS citizen_signal_anonymous_supports_count
  ON public.citizen_signal_anonymous_supports;

CREATE TRIGGER citizen_signal_anonymous_supports_count
  AFTER INSERT OR DELETE ON public.citizen_signal_anonymous_supports
  FOR EACH ROW
  EXECUTE FUNCTION public.citizen_signal_anonymous_support_count_trigger();

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

ALTER TABLE public.citizen_signal_anonymous_supports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS citizen_signal_anonymous_supports_admin_all
  ON public.citizen_signal_anonymous_supports;
CREATE POLICY citizen_signal_anonymous_supports_admin_all
  ON public.citizen_signal_anonymous_supports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.user_type = 'admin'
    )
  );

-- Anonymous + authenticated may insert directly only when the parent
-- signal is published. The API layer also rate-limits this, so the
-- belt+braces here is: cannot support drafts or rejected rows.
DROP POLICY IF EXISTS citizen_signal_anonymous_supports_anon_insert
  ON public.citizen_signal_anonymous_supports;
CREATE POLICY citizen_signal_anonymous_supports_anon_insert
  ON public.citizen_signal_anonymous_supports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.citizen_signals s
       WHERE s.id = citizen_signal_anonymous_supports.signal_id
         AND s.publication_status = 'published'
    )
  );

-- Read access is open so the public detail page can read counts directly
-- if needed; the aggregate is also exposed via citizen_signals_public.
DROP POLICY IF EXISTS citizen_signal_anonymous_supports_public_select
  ON public.citizen_signal_anonymous_supports;
CREATE POLICY citizen_signal_anonymous_supports_public_select
  ON public.citizen_signal_anonymous_supports
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.citizen_signals s
       WHERE s.id = citizen_signal_anonymous_supports.signal_id
         AND s.publication_status = 'published'
    )
  );

-- Explicitly deny anon UPDATE/DELETE by simply not defining a policy
-- (RLS denies by default for anon when no matching policy exists).

-- =============================================================================
-- 5. Re-create citizen_signals_public to expose anonymous_support_count
-- =============================================================================
--
-- Anything that selected from the view before this migration continues
-- to work; we are strictly additive. The view is recreated rather than
-- altered because Postgres does not allow ALTER VIEW … ADD COLUMN.

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
  cs.anonymous_support_count,
  cs.stage1_met_at,
  cs.stage2_met_at,
  cs.created_at,
  cs.updated_at
FROM public.citizen_signals cs
WHERE cs.publication_status = 'published';

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Excludes author_user_id, moderator-only fields, and unmoderated content. Includes both verified cosign_count and friction-light anonymous_support_count.';

GRANT SELECT ON public.citizen_signals_public TO anon, authenticated;
