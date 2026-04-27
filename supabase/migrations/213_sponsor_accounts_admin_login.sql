-- 213: sponsor admin UI + per-sponsor login code
--
-- Feature 2 of the draft/sponsor work: lets an admin create a sponsor account,
-- assign one or more Pulse markets to it, and hand the sponsor a short code
-- they type into /sponsor/login to land on their existing /dashboard/sponsor/
-- [access_token] page.
--
-- NAMING NOTE: this column is `coupon_code` per the product spec. It is
-- distinct from the existing `public.coupon_codes` table (promo / discount
-- codes that, when redeemed, can spawn sponsor accounts). Concretely:
--   * `coupon_codes.code`         = global promo string (limits, expirations)
--   * `sponsor_accounts.coupon_code` = per-sponsor login key (1:1 with account)
-- They never collide because they live in different tables. If we ever fold
-- the two concepts together, drop this column and update /sponsor/login.

BEGIN;

-- 1. Add per-sponsor login code + freeform notes.
ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Case-insensitive uniqueness so "abc12345" and "ABC12345" can't both exist.
-- Application code uppercases on insert; the index is just defense-in-depth.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_accounts_coupon_code_ci
  ON public.sponsor_accounts (upper(coupon_code))
  WHERE coupon_code IS NOT NULL;

COMMENT ON COLUMN public.sponsor_accounts.coupon_code IS
  'Per-sponsor login key entered at /sponsor/login. NOT a promo code (see public.coupon_codes for those).';
COMMENT ON COLUMN public.sponsor_accounts.notes IS
  'Internal admin notes about the sponsor (not shown to the sponsor).';

-- 2. prediction_markets.sponsor_account_id already exists (migration 159) with
-- the partial index idx_prediction_markets_sponsor_account_id. Nothing to add.

-- 3. RLS: admins get full access. Existing policy
-- "users_read_own_sponsor_accounts" stays in place for non-admin self-read.
DROP POLICY IF EXISTS "admin_full_sponsor_accounts" ON public.sponsor_accounts;

CREATE POLICY "admin_full_sponsor_accounts"
  ON public.sponsor_accounts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Sponsor self-read by login session is intentionally NOT a policy here. The
-- /dashboard/sponsor/[access_token] flow uses createAdminClient() (service
-- role), so it bypasses RLS. If we ever move the dashboard to anon-key reads,
-- add a policy keyed off a verified JWT claim or a Supabase session — not the
-- speculative `current_setting('request.sponsor_account_id')` pattern, which
-- nothing sets in this codebase.

COMMIT;
