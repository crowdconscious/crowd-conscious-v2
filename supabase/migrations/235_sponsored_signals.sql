-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-market batch: 232 -> 233 -> 234 -> 235.
-- =============================================================================
-- PROMPT 5 — Sponsored Signals + the HARD integrity boundary.
--
-- A Citizen Signal may be SPONSORED (a brand pays to attach a transparent badge
-- + route the flat-20% fund cut). It must be STRUCTURALLY IMPOSSIBLE for any
-- sponsorship to influence the signal's content, status, thresholds, or co-firma
-- (cosign) counts. Co-firmas stay citizen-only and are counted identically
-- whether or not a signal is sponsored.
--
-- HOW THE BOUNDARY IS ENFORCED (defense in depth):
--   1) SEPARATE TABLE. Sponsorship lives in public.signal_sponsorships, which
--      only references a signal by signal_id (FK) and carries badge/pillar
--      fields. It has NO column for title/body/status/threshold_stage/
--      cosign_count, so it is physically incapable of storing signal content or
--      counts.
--   2) NO WRITE PATH INTO THE SIGNAL. Nothing here grants writes to
--      public.citizen_signals or public.citizen_signal_cosigns. Their existing
--      RLS is untouched: cosigns are author/citizen INSERT only (one row per
--      user, UNIQUE(signal_id,user_id) from migration 219) and the
--      cosign_count is maintained solely by the citizen_signal_cosign_count
--      trigger fed by that citizen-only table. A sponsorship row cannot add,
--      remove, or reweight a co-firma.
--   3) sponsorable IS ADMIN-ONLY. A new boolean citizen_signals.sponsorable
--      (default false) gates eligibility. A BEFORE INSERT/UPDATE trigger rejects
--      any attempt by a non-admin, non-service caller to set it true or change
--      it — RLS cannot express this column-level rule, so the trigger is the
--      structural guard.
--   4) PUBLIC SEES BADGE ONLY. signal_sponsorships is public-read ONLY for
--      already-published signals (via is_signal_published, migration 230); the
--      badge/transparency fields are read-only to the public and writes are
--      service-role/admin only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. citizen_signals.sponsorable — admin-only eligibility flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS sponsorable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.citizen_signals.sponsorable IS
  'Admin-only flag: may this signal be sponsored? Default false. Enforced by trigger enforce_signal_sponsorable_admin_only — citizens cannot set it.';

-- Column-level guard: only an admin (public.is_admin) or the service role may
-- set/alter sponsorable. Runs regardless of RLS, so it cannot be bypassed by a
-- direct supabase-js write from a signal author.
CREATE OR REPLACE FUNCTION public.enforce_signal_sponsorable_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  is_privileged := public.is_admin() OR coalesce(auth.role(), '') = 'service_role';

  IF TG_OP = 'INSERT' THEN
    IF NEW.sponsorable IS TRUE AND NOT is_privileged THEN
      RAISE EXCEPTION 'Only admins may create a sponsorable signal'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.sponsorable IS DISTINCT FROM OLD.sponsorable AND NOT is_privileged THEN
      RAISE EXCEPTION 'Only admins may change citizen_signals.sponsorable'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS citizen_signals_sponsorable_guard ON public.citizen_signals;
CREATE TRIGGER citizen_signals_sponsorable_guard
  BEFORE INSERT OR UPDATE ON public.citizen_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_signal_sponsorable_admin_only();

-- ---------------------------------------------------------------------------
-- 2. signal_sponsorships — the badge/transparency join (NO content, NO counts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signal_sponsorships (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id      uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  sponsorship_id uuid NOT NULL REFERENCES public.creator_sponsorships(id) ON DELETE CASCADE,
  -- Which fund pillar this sponsorship's 20% is tagged to.
  fund_pillar    text NOT NULL CHECK (fund_pillar IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade')),
  -- Disclosure copy shown with the "Patrocinado" badge. NOT NULL so a sponsored
  -- signal can never render without a transparency message.
  badge_message  text NOT NULL CHECK (length(btrim(badge_message)) > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_sponsorships_unique UNIQUE (signal_id, sponsorship_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_sponsorships_signal
  ON public.signal_sponsorships (signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_sponsorships_sponsorship
  ON public.signal_sponsorships (sponsorship_id);

COMMENT ON TABLE public.signal_sponsorships IS
  'Badge/transparency join between a Citizen Signal and a sponsorship. Uses the pulse_signal split (fund 20 / creator 0 / platform 80). Carries NO signal content/status/threshold/cosign fields by design — the integrity boundary. Writes = service role / admin only.';

ALTER TABLE public.signal_sponsorships ENABLE ROW LEVEL SECURITY;

-- Public read ONLY for published signals (badge transparency), mirroring the
-- citizen_signal_comments pattern (migration 230). No row detail leaks for
-- unpublished signals.
DROP POLICY IF EXISTS signal_sponsorships_public_select ON public.signal_sponsorships;
CREATE POLICY signal_sponsorships_public_select
  ON public.signal_sponsorships
  FOR SELECT
  TO anon, authenticated
  USING (public.is_signal_published(signal_id));

-- Admin may attach/detach/adjust the badge. The money flow itself is created by
-- the service role (Stripe webhook), which bypasses RLS.
DROP POLICY IF EXISTS signal_sponsorships_admin_write ON public.signal_sponsorships;
CREATE POLICY signal_sponsorships_admin_write
  ON public.signal_sponsorships
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- NOTE: there is intentionally NO policy or trigger that lets signal_sponsorships
-- (or any sponsorship actor) write public.citizen_signals or
-- public.citizen_signal_cosigns. Those tables keep their migration 219/227/230
-- RLS unchanged. Co-firmas remain citizen-only and are counted identically
-- regardless of sponsorship.
