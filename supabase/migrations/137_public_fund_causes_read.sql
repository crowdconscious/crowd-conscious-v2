-- 137: Allow public (anon) read of fund_causes and fund_votes for landing page
-- Purpose: Show Conscious Fund causes and vote counts to non-logged-in visitors

-- fund_causes: allow anon to read active causes
DROP POLICY IF EXISTS "Anyone authenticated can view causes" ON public.fund_causes;
CREATE POLICY "Anyone can view active causes" ON public.fund_causes
  FOR SELECT USING (active = true);

-- fund_votes: allow anon to read for vote count aggregation (no PII exposed)
DROP POLICY IF EXISTS "Users can view all votes" ON public.fund_votes;
CREATE POLICY "Anyone can view votes" ON public.fund_votes
  FOR SELECT USING (true);
