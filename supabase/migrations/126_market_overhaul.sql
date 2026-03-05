-- ============================================================
-- 126: MARKET OVERHAUL - Multi-outcome + Free-to-play
-- ============================================================
-- Purpose: Add support for markets with 2+ outcomes (not just
-- binary YES/NO). Create the free-to-play vote system.
-- DATABASE ONLY - No frontend changes.
-- ============================================================

-- 1. Market Outcomes Table
-- Each market can have 2+ outcomes (replaces binary YES/NO)
-- For binary markets: create 2 outcomes ("Yes", "No")
-- For multi-outcome: create N outcomes ("Mexico", "South Korea", etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.market_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid REFERENCES public.prediction_markets(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  description text,
  probability numeric DEFAULT 0.5 NOT NULL CHECK (probability >= 0 AND probability <= 1),
  vote_count integer DEFAULT 0 NOT NULL,
  total_confidence integer DEFAULT 0 NOT NULL,
  sort_order integer DEFAULT 0,
  is_winner boolean,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_outcomes_market ON public.market_outcomes(market_id);

-- 2. Market Votes Table
-- Replaces prediction_trades for free-to-play
-- One vote per user per market (they pick ONE outcome)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.market_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id uuid REFERENCES public.prediction_markets(id) ON DELETE CASCADE NOT NULL,
  outcome_id uuid REFERENCES public.market_outcomes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 1 AND confidence <= 10),
  xp_earned integer NOT NULL DEFAULT 5,
  is_correct boolean,
  bonus_xp integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(market_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_market_votes_market ON public.market_votes(market_id);
CREATE INDEX IF NOT EXISTS idx_market_votes_user ON public.market_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_market_votes_outcome ON public.market_votes(outcome_id);

-- 3. Sponsor fields on prediction_markets
-- ============================================================

ALTER TABLE public.prediction_markets
ADD COLUMN IF NOT EXISTS sponsor_name text,
ADD COLUMN IF NOT EXISTS sponsor_logo_url text,
ADD COLUMN IF NOT EXISTS sponsor_contribution numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS market_type text DEFAULT 'binary',
ADD COLUMN IF NOT EXISTS total_votes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS resolution text;

-- Add check constraint for market_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prediction_markets_market_type_check'
  ) THEN
    ALTER TABLE public.prediction_markets
    ADD CONSTRAINT prediction_markets_market_type_check
    CHECK (market_type IN ('binary', 'multi'));
  END IF;
END $$;

-- 4. RLS Policies
-- ============================================================

ALTER TABLE public.market_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view outcomes" ON public.market_outcomes;
CREATE POLICY "Anyone can view outcomes" ON public.market_outcomes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view votes" ON public.market_votes;
CREATE POLICY "Anyone can view votes" ON public.market_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.market_votes;
CREATE POLICY "Authenticated users can vote" ON public.market_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Core RPC: Execute a vote
-- ============================================================

CREATE OR REPLACE FUNCTION public.execute_market_vote(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_existing public.market_votes%ROWTYPE;
  v_xp integer;
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
BEGIN
  -- Validate market
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;

  -- Validate outcome belongs to market
  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  -- Check user hasn't already voted on this market
  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already voted on this market');
  END IF;

  -- Validate confidence
  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  -- Calculate XP: base 5 + (confidence - 1) bonus = range 5-14
  v_xp := 5 + (p_confidence - 1);

  -- Insert vote
  INSERT INTO public.market_votes (market_id, outcome_id, user_id, confidence, xp_earned)
  VALUES (p_market_id, p_outcome_id, p_user_id, p_confidence, v_xp)
  RETURNING id INTO v_vote_id;

  -- Update outcome vote count
  UPDATE public.market_outcomes
  SET vote_count = vote_count + 1,
      total_confidence = total_confidence + p_confidence
  WHERE id = p_outcome_id;

  -- Update market total votes
  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  -- Recalculate ALL outcome probabilities for this market
  SELECT SUM(total_confidence) INTO v_total_weight
  FROM public.market_outcomes WHERE market_id = p_market_id;

  IF v_total_weight > 0 THEN
    FOR v_outcome_rec IN
      SELECT id, total_confidence FROM public.market_outcomes WHERE market_id = p_market_id
    LOOP
      UPDATE public.market_outcomes
      SET probability = v_outcome_rec.total_confidence::numeric / v_total_weight
      WHERE id = v_outcome_rec.id;
    END LOOP;
  END IF;

  -- Update market's current_probability (0-100 scale for compatibility)
  -- For binary: use "Yes" outcome probability * 100
  -- For multi: use highest outcome probability * 100
  IF COALESCE(v_market.market_type, 'binary') = 'binary' THEN
    UPDATE public.prediction_markets
    SET current_probability = COALESCE((
      SELECT probability * 100 FROM public.market_outcomes
      WHERE market_id = p_market_id AND LOWER(label) IN ('yes', 'sí', 'si')
      LIMIT 1
    ), 50)
    WHERE id = p_market_id;
  ELSE
    UPDATE public.prediction_markets
    SET current_probability = COALESCE((
      SELECT MAX(probability) * 100 FROM public.market_outcomes WHERE market_id = p_market_id
    ), 50)
    WHERE id = p_market_id;
  END IF;

  -- Insert history point (prediction_market_history uses volume_24h, trade_count)
  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = p_outcome_id),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  -- Award XP: insert transaction and update user_xp
  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (p_user_id, v_xp, 'prediction_vote', v_vote_id,
    'Predicted: ' || LEFT(v_outcome.label, 30) || ' on ' || LEFT(v_market.title, 40));

  INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
  VALUES (p_user_id, v_xp, 1, 0.0, 500)
  ON CONFLICT (user_id) DO UPDATE
  SET total_xp = public.user_xp.total_xp + v_xp, updated_at = now();

  -- Update leaderboard if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
    INSERT INTO public.leaderboards (user_id, total_xp, tier)
    SELECT p_user_id, ux.total_xp, ux.current_tier
    FROM public.user_xp ux WHERE ux.user_id = p_user_id
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = EXCLUDED.total_xp, tier = EXCLUDED.tier, updated_at = now();
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
    'confidence', p_confidence
  );
END;
$$;

-- 6. Resolve market RPC (with multi-outcome support)
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_market_free(
  p_market_id uuid,
  p_winning_outcome_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote RECORD;
  v_bonus integer;
  v_correct integer := 0;
  v_total integer := 0;
  v_winning_label text;
BEGIN
  -- Validate winning outcome belongs to market
  IF NOT EXISTS (
    SELECT 1 FROM public.market_outcomes
    WHERE id = p_winning_outcome_id AND market_id = p_market_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome');
  END IF;

  SELECT label INTO v_winning_label FROM public.market_outcomes WHERE id = p_winning_outcome_id;

  -- Mark market resolved
  UPDATE public.prediction_markets
  SET status = 'resolved',
      resolution = v_winning_label,
      resolved_outcome = (v_winning_label ILIKE 'yes' OR v_winning_label ILIKE 'sí' OR v_winning_label ILIKE 'si'),
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_market_id;

  -- Mark winning outcome
  UPDATE public.market_outcomes SET is_winner = true WHERE id = p_winning_outcome_id;
  UPDATE public.market_outcomes SET is_winner = false
  WHERE market_id = p_market_id AND id != p_winning_outcome_id;

  -- Award XP to correct voters
  FOR v_vote IN
    SELECT * FROM public.market_votes WHERE market_id = p_market_id
  LOOP
    v_total := v_total + 1;

    IF v_vote.outcome_id = p_winning_outcome_id THEN
      v_bonus := GREATEST(5, (50 * v_vote.confidence) / 10);
      v_correct := v_correct + 1;

      UPDATE public.market_votes
      SET is_correct = true, bonus_xp = v_bonus
      WHERE id = v_vote.id;

      INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
      VALUES (v_vote.user_id, v_bonus, 'prediction_correct', v_vote.id, 'Correct prediction! Bonus XP');

      UPDATE public.user_xp
      SET total_xp = total_xp + v_bonus, updated_at = now()
      WHERE user_id = v_vote.user_id;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
        UPDATE public.leaderboards
        SET total_xp = total_xp + v_bonus, updated_at = now()
        WHERE user_id = v_vote.user_id;
      END IF;
    ELSE
      UPDATE public.market_votes
      SET is_correct = false, bonus_xp = 0
      WHERE id = v_vote.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_voters', v_total,
    'correct_voters', v_correct,
    'winning_outcome', v_winning_label
  );
END;
$$;

-- 7. Helper: Create a binary market with outcomes
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_binary_market(
  p_title text,
  p_description text,
  p_category text,
  p_created_by uuid,
  p_end_date timestamptz,
  p_sponsor_name text DEFAULT NULL,
  p_sponsor_logo_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_id uuid;
BEGIN
  INSERT INTO public.prediction_markets (
    title, description, category, created_by, resolution_date,
    resolution_criteria, market_type, sponsor_name, sponsor_logo_url, image_url,
    status, current_probability
  )
  VALUES (
    p_title, p_description, p_category, p_created_by, p_end_date,
    COALESCE(p_description, 'Standard resolution'), 'binary',
    p_sponsor_name, p_sponsor_logo_url, p_image_url,
    'active', 50.00
  )
  RETURNING id INTO v_market_id;

  INSERT INTO public.market_outcomes (market_id, label, probability, sort_order)
  VALUES
    (v_market_id, 'Yes', 0.5, 0),
    (v_market_id, 'No', 0.5, 1);

  RETURN v_market_id;
END;
$$;

-- 8. Helper: Create a multi-outcome market
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_multi_market(
  p_title text,
  p_description text,
  p_category text,
  p_created_by uuid,
  p_end_date timestamptz,
  p_outcomes text[],
  p_sponsor_name text DEFAULT NULL,
  p_sponsor_logo_url text DEFAULT NULL,
  p_image_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market_id uuid;
  v_label text;
  v_initial_prob numeric;
  v_sort integer := 0;
BEGIN
  v_initial_prob := 1.0 / NULLIF(array_length(p_outcomes, 1), 0);

  INSERT INTO public.prediction_markets (
    title, description, category, created_by, resolution_date,
    resolution_criteria, market_type, sponsor_name, sponsor_logo_url, image_url,
    status, current_probability
  )
  VALUES (
    p_title, p_description, p_category, p_created_by, p_end_date,
    COALESCE(p_description, 'Standard resolution'), 'multi',
    p_sponsor_name, p_sponsor_logo_url, p_image_url,
    'active', v_initial_prob * 100
  )
  RETURNING id INTO v_market_id;

  FOREACH v_label IN ARRAY p_outcomes
  LOOP
    INSERT INTO public.market_outcomes (market_id, label, probability, sort_order)
    VALUES (v_market_id, v_label, v_initial_prob, v_sort);
    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_market_id;
END;
$$;

COMMENT ON TABLE public.market_outcomes IS 'Outcomes for prediction markets (binary or multi)';
COMMENT ON TABLE public.market_votes IS 'Free-to-play votes: one per user per market';
COMMENT ON FUNCTION public.execute_market_vote IS 'Cast a vote on a market outcome (free-to-play)';
COMMENT ON FUNCTION public.resolve_market_free IS 'Resolve market with winning outcome (multi-outcome support)';
COMMENT ON FUNCTION public.create_binary_market IS 'Create a binary Yes/No market with outcomes';
COMMENT ON FUNCTION public.create_multi_market IS 'Create a multi-outcome market';

-- ============================================================
-- VERIFICATION (run after applying migration)
-- ============================================================
-- 1. Verify tables exist:
--    SELECT * FROM market_outcomes LIMIT 1;
--    SELECT * FROM market_votes LIMIT 1;
--
-- 2. Test binary market (use valid category: world, government, corporate, community, cause):
--    SELECT create_binary_market(
--      'Test: Will it rain tomorrow?',
--      'Testing binary market creation',
--      'world',
--      (SELECT id FROM auth.users LIMIT 1),
--      now() + interval '7 days'
--    );
--    SELECT * FROM market_outcomes;
--
-- 3. Test multi-outcome market:
--    SELECT create_multi_market(
--      'Who will win World Cup Group A?',
--      'Mexico, South Korea, South Africa, or UEFA Playoff D?',
--      'world',
--      (SELECT id FROM auth.users LIMIT 1),
--      now() + interval '90 days',
--      ARRAY['Mexico', 'South Korea', 'South Africa', 'UEFA Playoff D']
--    );
--    SELECT * FROM market_outcomes;
