-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-tiers batch: 237 -> 238 -> 239.
-- (Depends on creator_sponsorships from migration 233.)
-- =============================================================================
-- EXTEND creator_sponsorships WITH TIER METADATA (additive, nullable).
--
-- Adds the tier/placement signal + the support-tier shout-out + the optional
-- checkout top-up to the existing sponsorship row (created by the service-role
-- webhook). These are ADDITIVE and nullable so legacy / non-tiered rows are valid.
--
--   * tier             — which constrained placement the sponsor bought. NULL for
--                        legacy / non-tiered rows. The card renderer keys placement
--                        OFF THIS COLUMN:
--                          support  => no logo placement; render supporter_message
--                                      (moderated) as a shout-out.
--                          sponsor  => constrained card, 1 slot.
--                          featured => constrained card in 2 slots + "Con el apoyo
--                                      de [logo]" byline.
--   * supporter_message — optional moderated shout-out, ONLY meaningful for the
--                        'support' tier (no logo placement). App moderates before
--                        display.
--   * top_up_amount    — optional sponsor top-up added at checkout. The money math is:
--                          gross_amount = tier_price + top_up_amount.
--
-- SPLITS ARE UNCHANGED. tier does NOT change the revenue split %; the split is
-- still resolved by SOURCING via revenue_split_configs (creator-link =>
-- creator_sourced, organic => platform_sourced; Fund is always 20%) and
-- snapshotted onto fund_amount / creator_amount / platform_amount by the webhook.
--
-- Writes to creator_sponsorships remain SERVICE-ROLE ONLY (RLS from 233 unchanged):
-- these are money rows, set by the webhook — NOT creator-owned config.
-- =============================================================================

ALTER TABLE public.creator_sponsorships
  ADD COLUMN IF NOT EXISTS tier             text,
  ADD COLUMN IF NOT EXISTS supporter_message text,
  ADD COLUMN IF NOT EXISTS top_up_amount    numeric(12, 2) DEFAULT 0;

-- tier is nullable (legacy/non-tiered), but when present must be a known value.
ALTER TABLE public.creator_sponsorships
  DROP CONSTRAINT IF EXISTS creator_sponsorships_tier_chk;
ALTER TABLE public.creator_sponsorships
  ADD CONSTRAINT creator_sponsorships_tier_chk
  CHECK (tier IS NULL OR tier IN ('support', 'sponsor', 'featured'));

-- top_up_amount, when set, is non-negative.
ALTER TABLE public.creator_sponsorships
  DROP CONSTRAINT IF EXISTS creator_sponsorships_top_up_amount_chk;
ALTER TABLE public.creator_sponsorships
  ADD CONSTRAINT creator_sponsorships_top_up_amount_chk
  CHECK (top_up_amount IS NULL OR top_up_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_creator_sponsorships_tier
  ON public.creator_sponsorships (tier);

COMMENT ON COLUMN public.creator_sponsorships.tier IS
  'Constrained placement tier bought (support/sponsor/featured). NULL for legacy/non-tiered rows. The card renderer keys placement off this column. Does NOT change the revenue split %.';
COMMENT ON COLUMN public.creator_sponsorships.supporter_message IS
  'Optional moderated shout-out, only meaningful for the support tier (no logo placement). App moderates before display.';
COMMENT ON COLUMN public.creator_sponsorships.top_up_amount IS
  'Optional sponsor top-up added at checkout. gross_amount = tier_price + top_up_amount.';
