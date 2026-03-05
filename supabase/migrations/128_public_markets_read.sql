-- ============================================================
-- 128: Allow public (anonymous) read access to prediction markets
-- ============================================================
-- Purpose: Let logged-out users browse markets at /markets
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can view prediction markets" ON public.prediction_markets;
CREATE POLICY "Anyone can view markets" ON public.prediction_markets
  FOR SELECT USING (true);
