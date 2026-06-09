-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-market batch: 232 -> 233 -> 234 -> 235.
-- =============================================================================
-- PROMPT 2 — Monetization core.
--
-- LOCKED ECONOMICS: Conscious Fund = FLAT 20% of gross on everything. The split
-- (creator / fund / platform) is resolved by the Stripe webhook from checkout
-- metadata and SNAPSHOTTED onto the sponsorship row at creation, so later config
-- changes never rewrite history. Split labels live in revenue_split_configs.
--
-- IMPORTANT (cross-worker overlap): a separate worker owns the flat-20% change
-- in lib/pulse-tiers.ts / pricing copy. This migration only provisions schema;
-- it does NOT compute or backfill any amounts. The OPTIONAL backfill is a
-- separate, commented file — review before running.
--
-- TABLES:
--   * creator_sponsorships  — NEW, clean table. The legacy public.sponsorships
--                             table is UNRELATED and left UNTOUCHED. See note A.
--   * revenue_split_configs — NEW. Four split labels, CHECK(sum = 100).
--   * conscious_fund_contributions — NEW single fund ledger.
--   * conscious_fund_distributions — NEW outflow ledger to causes.
--
-- RLS: all money WRITES are service-role only (no write policy => denied for
-- anon/auth; the service role bypasses RLS). Public reads are AGGREGATES ONLY,
-- exposed through dedicated views; the raw ledgers are admin-read.
-- =============================================================================

-- ===========================================================================
-- NOTE A — creator_sponsorships is a CLEAN, SEPARATE NEW table.
-- The legacy `public.sponsorships` table (old communities/content model:
-- NOT NULL content_id -> community_content, sponsor_id -> profiles, amount;
-- see docs/archives/database-schema.sql + migration 142 + migration 155) is
-- UNRELATED to the creator market and is left COMPLETELY UNTOUCHED by this
-- batch. We do NOT alter it, add columns to it, change its constraints, or
-- attach RLS to it. All creator-market sponsorship records live here instead.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.creator_sponsorships (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name          text NOT NULL,
  sponsor_logo_url      text,
  sponsor_contact       text,
  sponsor_email         text,
  surface_type          text NOT NULL CHECK (surface_type IN ('pulse', 'blog', 'signal')),
  source_id             uuid,
  sourced_by            text NOT NULL CHECK (sourced_by IN ('creator', 'platform', 'editorial')),
  creator_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  gross_amount          numeric(12, 2),
  currency              text NOT NULL DEFAULT 'MXN',
  fund_amount           numeric(12, 2),
  creator_amount        numeric(12, 2),
  platform_amount       numeric(12, 2),
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'refunded', 'disputed', 'ended')),
  stripe_session_id     text UNIQUE,
  stripe_payment_intent text,
  stripe_event_id       text,
  flagged_self_sponsor  boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- Disclosure: a sponsor_name is mandatory so the "Patrocinado" label is never
  -- empty (sponsor_name is NOT NULL above; this also forbids blank/whitespace).
  CONSTRAINT creator_sponsorships_disclosure_chk
    CHECK (length(btrim(sponsor_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_creator_sponsorships_surface
  ON public.creator_sponsorships (surface_type, source_id);
CREATE INDEX IF NOT EXISTS idx_creator_sponsorships_creator
  ON public.creator_sponsorships (creator_id);

COMMENT ON TABLE public.creator_sponsorships IS
  'Creator-market sponsorship records. surface_type, sourced_by, creator_id and the fund/creator/platform amounts are snapshotted by the Stripe webhook at creation. Unrelated to the legacy public.sponsorships table. Money writes = service role only.';

-- Money writes are service-role only (no INSERT/UPDATE/DELETE policy => denied
-- for anon/auth; the service role bypasses RLS).
ALTER TABLE public.creator_sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_sponsorships_admin_select ON public.creator_sponsorships;
CREATE POLICY creator_sponsorships_admin_select
  ON public.creator_sponsorships
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- A creator may read their OWN sponsorship rows (earnings transparency).
DROP POLICY IF EXISTS creator_sponsorships_creator_select_own ON public.creator_sponsorships;
CREATE POLICY creator_sponsorships_creator_select_own
  ON public.creator_sponsorships
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. revenue_split_configs — the four named splits. CHECK(sum = 100).
--    Ordering of percentages below is fund / creator / platform.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_split_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL UNIQUE,
  fund_pct      numeric(5, 2) NOT NULL CHECK (fund_pct >= 0 AND fund_pct <= 100),
  creator_pct   numeric(5, 2) NOT NULL CHECK (creator_pct >= 0 AND creator_pct <= 100),
  platform_pct  numeric(5, 2) NOT NULL CHECK (platform_pct >= 0 AND platform_pct <= 100),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_split_configs_sum_100_chk
    CHECK (fund_pct + creator_pct + platform_pct = 100)
);

COMMENT ON TABLE public.revenue_split_configs IS
  'Named revenue splits resolved by the Stripe webhook from checkout metadata and snapshotted onto creator_sponsorships. Fund is always 20%.';

-- Seed the four canonical labels. DO NOTHING on conflict so a re-run never
-- clobbers a live config edit (history lives on the snapshotted sponsorship rows).
INSERT INTO public.revenue_split_configs (label, fund_pct, creator_pct, platform_pct)
VALUES
  ('creator_sourced',  20, 60, 20),
  ('platform_sourced', 20, 20, 60),
  ('editorial',        20,  0, 80),
  ('pulse_signal',     20,  0, 80)
ON CONFLICT (label) DO NOTHING;

ALTER TABLE public.revenue_split_configs ENABLE ROW LEVEL SECURITY;

-- Public read: the splits are transparency data (shows the flat 20% fund).
DROP POLICY IF EXISTS revenue_split_configs_public_select ON public.revenue_split_configs;
CREATE POLICY revenue_split_configs_public_select
  ON public.revenue_split_configs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins may change the splits.
DROP POLICY IF EXISTS revenue_split_configs_admin_write ON public.revenue_split_configs;
CREATE POLICY revenue_split_configs_admin_write
  ON public.revenue_split_configs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. conscious_fund_contributions — single fund ledger (the 20% inflow).
--    NOTE: distinct from the legacy `conscious_fund` (balance) and
--    `conscious_fund_transactions` tables. This is the new unified inflow
--    ledger across pulse/blog/signal/donation surfaces.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conscious_fund_contributions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type    text NOT NULL CHECK (source_type IN ('pulse', 'blog', 'signal', 'donation')),
  source_id      uuid,
  amount         numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency       text NOT NULL DEFAULT 'MXN',
  fund_pillar    text CHECK (fund_pillar IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade')),
  sponsorship_id uuid REFERENCES public.creator_sponsorships(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_contributions_source
  ON public.conscious_fund_contributions (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_fund_contributions_pillar
  ON public.conscious_fund_contributions (fund_pillar);
CREATE INDEX IF NOT EXISTS idx_fund_contributions_created
  ON public.conscious_fund_contributions (created_at DESC);

COMMENT ON TABLE public.conscious_fund_contributions IS
  'Single Conscious Fund inflow ledger (flat 20% of gross). source_id/sponsorship_id are nullable (e.g. raw donations). Writes = service role only; public reads via the aggregate view only.';

ALTER TABLE public.conscious_fund_contributions ENABLE ROW LEVEL SECURITY;

-- No write policy => anon/authenticated cannot write; service role bypasses RLS.
-- Admin read of the raw ledger for dashboards/audit.
DROP POLICY IF EXISTS fund_contributions_admin_select ON public.conscious_fund_contributions;
CREATE POLICY fund_contributions_admin_select
  ON public.conscious_fund_contributions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Public AGGREGATE view (no row detail). Owned by the migration runner, so it
-- reads past RLS and exposes only sums.
CREATE OR REPLACE VIEW public.conscious_fund_contributions_totals AS
  SELECT
    source_type,
    fund_pillar,
    currency,
    count(*)        AS contribution_count,
    sum(amount)     AS total_amount
  FROM public.conscious_fund_contributions
  GROUP BY source_type, fund_pillar, currency;

GRANT SELECT ON public.conscious_fund_contributions_totals TO anon, authenticated;

COMMENT ON VIEW public.conscious_fund_contributions_totals IS
  'Public aggregate of the fund inflow ledger (no row-level detail). Safe for anon read.';

-- ---------------------------------------------------------------------------
-- 4. conscious_fund_distributions — outflow ledger to causes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conscious_fund_distributions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cause_id       uuid REFERENCES public.fund_causes(id) ON DELETE SET NULL,
  amount         numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency       text NOT NULL DEFAULT 'MXN',
  distributed_at timestamptz NOT NULL DEFAULT now(),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_distributions_cause
  ON public.conscious_fund_distributions (cause_id);
CREATE INDEX IF NOT EXISTS idx_fund_distributions_distributed
  ON public.conscious_fund_distributions (distributed_at DESC);

COMMENT ON TABLE public.conscious_fund_distributions IS
  'Conscious Fund outflow ledger (grants to causes). Writes = service role only; public reads via the aggregate view only.';

ALTER TABLE public.conscious_fund_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fund_distributions_admin_select ON public.conscious_fund_distributions;
CREATE POLICY fund_distributions_admin_select
  ON public.conscious_fund_distributions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE VIEW public.conscious_fund_distributions_totals AS
  SELECT
    cause_id,
    currency,
    count(*)      AS distribution_count,
    sum(amount)   AS total_amount,
    max(distributed_at) AS last_distributed_at
  FROM public.conscious_fund_distributions
  GROUP BY cause_id, currency;

GRANT SELECT ON public.conscious_fund_distributions_totals TO anon, authenticated;

COMMENT ON VIEW public.conscious_fund_distributions_totals IS
  'Public aggregate of fund distributions per cause (no row-level note). Safe for anon read.';
