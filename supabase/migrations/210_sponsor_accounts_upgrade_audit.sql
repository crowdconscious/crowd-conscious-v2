-- 210_sponsor_accounts_upgrade_audit.sql
-- Tier-upgrade audit trail on sponsor_accounts. Lets the new in-dashboard
-- upgrade flow:
--   1. Record the tier a sponsor was on before an upgrade (for reports + UI).
--   2. Timestamp the upgrade (for cohort analysis).
--   3. Dedupe webhook retries — Stripe can deliver checkout.session.completed
--      multiple times, and re-applying a tier change would double-count fund
--      contributions and reset used_pulse_markets on every retry.
--
-- Columns:
--   previous_tier             text, nullable — snapshot of the tier value
--                             immediately before the upgrade handler wrote
--                             the new one. Useful for "upgraded from X to Y"
--                             messaging and CSV exports.
--   tier_upgraded_at          timestamptz, nullable — timestamp set by the
--                             upgrade webhook handler. Never set by the
--                             Pulse-purchase-first-time path.
--   last_upgrade_session_id   text, nullable — Stripe checkout.session.id
--                             of the most recently applied upgrade. The
--                             handler refuses to apply the same session id
--                             twice; this is the idempotency guard.
--
-- Idempotent; safe to re-run.

BEGIN;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS previous_tier text;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS tier_upgraded_at timestamptz;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS last_upgrade_session_id text;

-- Unique partial index so two sponsor_accounts cannot share the same
-- upgrade session. Partial so NULL values (accounts that have never been
-- upgraded) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS sponsor_accounts_last_upgrade_session_uq
  ON public.sponsor_accounts(last_upgrade_session_id)
  WHERE last_upgrade_session_id IS NOT NULL;

COMMIT;
