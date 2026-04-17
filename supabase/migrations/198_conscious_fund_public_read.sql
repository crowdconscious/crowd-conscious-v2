-- ============================================================================
-- Make Conscious Fund balance publicly readable.
--
-- Context: migration 119 enabled RLS on `conscious_fund` with a policy that
-- required `auth.uid() IS NOT NULL`. This meant anonymous visitors on the
-- landing page and /about saw the fund as $0, while authenticated users saw
-- the real balance (~$10K). The product intent is *transparency* — anyone
-- should be able to see how much has been raised.
--
-- This migration replaces that policy with a public SELECT policy. Writes
-- remain restricted (they flow through Stripe webhooks and the trade RPC,
-- both of which use the service role key and bypass RLS).
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can view conscious fund" ON public.conscious_fund;
DROP POLICY IF EXISTS "Anyone can view conscious fund" ON public.conscious_fund;
CREATE POLICY "Anyone can view conscious fund"
  ON public.conscious_fund
  FOR SELECT
  USING (true);

-- Keep transactions restricted: the per-row detail (user_id, stripe id, etc.)
-- is sensitive. The aggregate count exposed by /api/fund/balance is fine
-- because it's returned via admin client server-side.
-- (No change to conscious_fund_transactions policy.)
