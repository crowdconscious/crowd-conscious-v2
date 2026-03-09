-- 138: Allow public read of sentiment_scores for OG images
-- Purpose: Show sentiment indicator on shared market cards

DROP POLICY IF EXISTS "Authenticated can view sentiment scores" ON public.sentiment_scores;
CREATE POLICY "Anyone can view sentiment scores" ON public.sentiment_scores
  FOR SELECT USING (true);
