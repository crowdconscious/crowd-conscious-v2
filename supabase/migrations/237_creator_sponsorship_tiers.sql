-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-tiers batch: 237 -> 238 -> 239.
-- (Depends on the creator-market batch 232 -> 233 -> 234 -> 235 being applied.)
-- =============================================================================
-- CREATOR SPONSORSHIP TIERS — per-creator price per tier.
--
-- PRODUCT: three constrained tiers (no advertorial). Each CREATOR sets their own
-- price per tier within PLATFORM-WIDE min/max guardrails (see 238). A sponsor may
-- add an optional TOP-UP at checkout; gross = tier_price + top_up. Tiers set
-- PRICE + PLACEMENT ONLY — they do NOT change the revenue split %. The split is
-- still resolved by SOURCING via revenue_split_configs (creator-link =>
-- creator_sourced, organic => platform_sourced; Fund is always 20%).
--
--   * support  ("Apoyo / Supporter")             — no logo placement; optional
--                                                   moderated supporter_message shout-out.
--   * sponsor  ("Patrocinador / Sponsor")        — constrained card, 1 slot.
--   * featured ("Patrocinador destacado / Featured") — constrained card in 2 slots
--                                                   + a "Con el apoyo de [logo]" byline.
--
-- This table is CONFIG OWNED BY THE CREATOR (not a money row). The OWNING creator
-- may insert/update/delete their own rows; everyone may read (the sponsor checkout
-- page must show a creator's tier prices to anon/auth). Admins manage all.
--
-- A creator WITHOUT rows here = tiers disabled / fall back to platform defaults
-- (sponsorship_tier_limits.default_price). The app treats "no enabled row for a
-- tier" as "that tier not offered by this creator".
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.creator_sponsorship_tiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier        text NOT NULL CHECK (tier IN ('support', 'sponsor', 'featured')),
  price       numeric(12, 2) NOT NULL CHECK (price >= 0),
  currency    text NOT NULL DEFAULT 'MXN',
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_sponsorship_tiers_creator_tier_key UNIQUE (creator_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_creator_sponsorship_tiers_creator
  ON public.creator_sponsorship_tiers (creator_id);

COMMENT ON TABLE public.creator_sponsorship_tiers IS
  'Per-creator price per sponsorship tier (support/sponsor/featured). Creator-owned config, NOT a money row. Public read (checkout); owning creator writes their own rows (creator_id = auth.uid()); admins manage all. No rows for a tier => that tier not offered (fall back to sponsorship_tier_limits defaults).';
COMMENT ON COLUMN public.creator_sponsorship_tiers.price IS
  'Creator-set price for this tier. App (and optional trigger in 238) enforces the platform-wide min/max from sponsorship_tier_limits. Tiers set price + placement only; they do NOT change the revenue split %.';
COMMENT ON COLUMN public.creator_sponsorship_tiers.enabled IS
  'Creator toggle to offer/hide this tier without deleting the configured price.';

ALTER TABLE public.creator_sponsorship_tiers ENABLE ROW LEVEL SECURITY;

-- Public read: the sponsor checkout page shows a creator's tier prices to anon/auth.
DROP POLICY IF EXISTS creator_sponsorship_tiers_public_select ON public.creator_sponsorship_tiers;
CREATE POLICY creator_sponsorship_tiers_public_select
  ON public.creator_sponsorship_tiers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owning creator manages their OWN tier prices (insert / update / delete).
DROP POLICY IF EXISTS creator_sponsorship_tiers_creator_insert ON public.creator_sponsorship_tiers;
CREATE POLICY creator_sponsorship_tiers_creator_insert
  ON public.creator_sponsorship_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS creator_sponsorship_tiers_creator_update ON public.creator_sponsorship_tiers;
CREATE POLICY creator_sponsorship_tiers_creator_update
  ON public.creator_sponsorship_tiers
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS creator_sponsorship_tiers_creator_delete ON public.creator_sponsorship_tiers;
CREATE POLICY creator_sponsorship_tiers_creator_delete
  ON public.creator_sponsorship_tiers
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Admins manage all tier rows.
DROP POLICY IF EXISTS creator_sponsorship_tiers_admin_all ON public.creator_sponsorship_tiers;
CREATE POLICY creator_sponsorship_tiers_admin_all
  ON public.creator_sponsorship_tiers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
