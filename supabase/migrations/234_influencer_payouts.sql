-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-market batch: 232 -> 233 -> 234 -> 235.
-- =============================================================================
-- PROMPT 3 (schema dependency) — influencer_payouts.
--
-- Per-creator, per-period payout ledger. The Stripe webhook / payout job (CODE
-- lands in a LATER round) computes total_earned from the snapshotted creator_amount
-- on sponsorships and advances status. This migration only provisions the table
-- + RLS. Prompt 4 adds NO new tables beyond this one.
--
-- RLS: a creator reads ONLY their own payout rows. All writes are service-role
-- only (no write policy => denied for anon/auth; service role bypasses RLS).
-- Admins may read all for finance dashboards.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.influencer_payouts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Payout period bucket, e.g. '2026-06' (month) or '2026-Q2'. Free text so the
  -- payout cadence can change without a schema migration.
  period                text NOT NULL,
  total_earned          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  amount_paid           numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  currency              text NOT NULL DEFAULT 'MXN',
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'held', 'released', 'paid')),
  released_at           timestamptz,
  paid_at               timestamptz,
  method                text,                 -- e.g. 'spei', 'paypal', 'manual'
  invoice_rfc           text,                 -- MX tax id on the creator's invoice
  invoice_url           text,
  flagged_self_sponsor  boolean NOT NULL DEFAULT false,
  note                  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT influencer_payouts_creator_period_key UNIQUE (creator_id, period)
);

CREATE INDEX IF NOT EXISTS idx_influencer_payouts_creator
  ON public.influencer_payouts (creator_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_status
  ON public.influencer_payouts (status);

COMMENT ON TABLE public.influencer_payouts IS
  'Per-creator, per-period payout ledger. total_earned derived from snapshotted sponsorships.creator_amount by the payout job. Creators read own only; writes = service role only.';
COMMENT ON COLUMN public.influencer_payouts.flagged_self_sponsor IS
  'True when the period contains a sponsorship the creator sourced for their own surface (self-deal); finance reviews before release.';

ALTER TABLE public.influencer_payouts ENABLE ROW LEVEL SECURITY;

-- Creator reads ONLY their own payout rows.
DROP POLICY IF EXISTS influencer_payouts_creator_select_own ON public.influencer_payouts;
CREATE POLICY influencer_payouts_creator_select_own
  ON public.influencer_payouts
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Admin read of all rows (finance dashboards).
DROP POLICY IF EXISTS influencer_payouts_admin_select ON public.influencer_payouts;
CREATE POLICY influencer_payouts_admin_select
  ON public.influencer_payouts
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policy: all writes flow through the service role
-- (payout job / Stripe webhook), which bypasses RLS.
