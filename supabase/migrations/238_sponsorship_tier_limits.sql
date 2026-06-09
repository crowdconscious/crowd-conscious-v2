-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-tiers batch: 237 -> 238 -> 239.
-- =============================================================================
-- SPONSORSHIP TIER LIMITS — platform-wide price guardrails per tier.
--
-- One row per tier. Bounds the per-creator prices in creator_sponsorship_tiers
-- (237). Public read (checkout/profile UI uses these to render the min/max and
-- the platform default for creators who have not set a custom price). Admin write.
--
-- LAUNCH PRICING (research-backed, founder-approved Jun 2026). MXN.
-- These are real launch numbers, tuned to early-stage reach; revisit as traffic
-- grows (raise floors once creators close consistently; add a CPM crossover).
-- Admins can adjust per-tier limits later via the admin UI / this table.
--
-- Enforcement of a creator's price against [min_price, max_price] is primarily
-- APP-LEVEL. An OPTIONAL trigger (commented at the bottom) can enforce it in the
-- database as well; it reads from THIS table so the guardrails stay in one place.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsorship_tier_limits (
  tier          text PRIMARY KEY CHECK (tier IN ('support', 'sponsor', 'featured')),
  min_price     numeric(12, 2) NOT NULL CHECK (min_price >= 0),
  max_price     numeric(12, 2) NOT NULL CHECK (max_price >= 0),
  default_price numeric(12, 2) NOT NULL CHECK (default_price >= 0),
  currency      text NOT NULL DEFAULT 'MXN',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsorship_tier_limits_range_chk
    CHECK (max_price >= min_price
       AND default_price >= min_price
       AND default_price <= max_price)
);

COMMENT ON TABLE public.sponsorship_tier_limits IS
  'Platform-wide price guardrails per sponsorship tier. Bounds creator_sponsorship_tiers.price. Public read; admin write. Seed values are founder-approved launch pricing (MXN).';

ALTER TABLE public.sponsorship_tier_limits ENABLE ROW LEVEL SECURITY;

-- Public read: checkout/profile UI renders min/max + platform default price.
DROP POLICY IF EXISTS sponsorship_tier_limits_public_select ON public.sponsorship_tier_limits;
CREATE POLICY sponsorship_tier_limits_public_select
  ON public.sponsorship_tier_limits
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins may change the guardrails.
DROP POLICY IF EXISTS sponsorship_tier_limits_admin_write ON public.sponsorship_tier_limits;
CREATE POLICY sponsorship_tier_limits_admin_write
  ON public.sponsorship_tier_limits
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- SEED — founder-approved launch pricing (MXN).
-- DO NOTHING on conflict so a re-run never clobbers later founder-edited values.
-- ---------------------------------------------------------------------------
INSERT INTO public.sponsorship_tier_limits (tier, min_price, max_price, default_price, currency)
VALUES
  ('support',    50,  1000,   150, 'MXN'),   -- launch pricing (research-backed, founder-approved)
  ('sponsor',   750,  5000,  1500, 'MXN'),   -- launch pricing (research-backed, founder-approved)
  ('featured', 2000, 12000,  4000, 'MXN')    -- launch pricing (research-backed, founder-approved)
ON CONFLICT (tier) DO NOTHING;

-- ---------------------------------------------------------------------------
-- OPTIONAL DB-LEVEL ENFORCEMENT (commented; app-level enforcement is primary).
-- Uncomment to also enforce [min_price, max_price] on creator_sponsorship_tiers
-- in the database. It references sponsorship_tier_limits so bounds stay in one
-- place. A disabled (enabled = false) tier row is allowed to skip the check so a
-- creator can park an out-of-range price while not offering the tier.
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION public.enforce_sponsorship_tier_price_bounds()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- AS $$
-- DECLARE
--   lim public.sponsorship_tier_limits%ROWTYPE;
-- BEGIN
--   IF NEW.enabled IS NOT TRUE THEN
--     RETURN NEW;
--   END IF;
--   SELECT * INTO lim FROM public.sponsorship_tier_limits WHERE tier = NEW.tier;
--   IF NOT FOUND THEN
--     RETURN NEW;  -- no guardrail configured for this tier
--   END IF;
--   IF NEW.price < lim.min_price OR NEW.price > lim.max_price THEN
--     RAISE EXCEPTION 'price % for tier % is outside platform bounds [%, %]',
--       NEW.price, NEW.tier, lim.min_price, lim.max_price;
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
--
-- DROP TRIGGER IF EXISTS creator_sponsorship_tiers_price_bounds
--   ON public.creator_sponsorship_tiers;
-- CREATE TRIGGER creator_sponsorship_tiers_price_bounds
--   BEFORE INSERT OR UPDATE ON public.creator_sponsorship_tiers
--   FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsorship_tier_price_bounds();
