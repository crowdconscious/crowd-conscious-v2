-- 211_sponsor_accounts_email_preferences.sql
-- Per-email-type notification preferences for sponsor accounts + a locale
-- hint so we send transactional email in the language the sponsor actually
-- reads the dashboard in.
--
-- Scope (PR 3 — sponsor email notifications):
--   * pulse_launch — fires when a new Pulse market is published
--   * pulse_closure — fires when a Pulse resolves
--   * Both default to TRUE (opt-out, per prompt). Sponsors can flip them
--     independently from the dashboard notifications section or via the
--     one-click unsubscribe link in each email.
--
-- Schema:
--   email_preferences JSONB NOT NULL DEFAULT '{"pulse_launch": true, "pulse_closure": true}'
--     * Non-null so `prefs.pulse_launch` is always safe to read from app
--       code without coalescing.
--     * JSONB (not two booleans) so future email types (milestone, digest)
--       can be added without a new migration per channel.
--   locale TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en'))
--     * Populated server-side whenever the sponsor saves preferences or
--       flips the dashboard language. Gives transactional email a DB-level
--       source of truth instead of deriving from a cookie at send time.
--
-- Idempotent; safe to re-run.

BEGIN;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS email_preferences jsonb
    NOT NULL
    DEFAULT '{"pulse_launch": true, "pulse_closure": true}'::jsonb;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS locale text
    NOT NULL
    DEFAULT 'es';

-- Constrain locale to known values. Wrapped in DO block so re-runs that
-- drop-then-add don't fail on "constraint already exists" from the prior
-- invocation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sponsor_accounts_locale_chk'
  ) THEN
    ALTER TABLE public.sponsor_accounts
      ADD CONSTRAINT sponsor_accounts_locale_chk
        CHECK (locale IN ('es', 'en'));
  END IF;
END
$$;

COMMIT;
