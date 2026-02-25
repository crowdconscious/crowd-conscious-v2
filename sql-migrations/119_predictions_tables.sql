-- =====================================================
-- 119: PREDICTION / COLLECTIVE CONSCIOUSNESS TABLES
-- =====================================================
-- Purpose: Add prediction markets, trades, wallets, and conscious fund
-- for the Collective Consciousness feature.
-- CRITICAL: This migration adds NEW tables only. No existing tables modified.
-- =====================================================

-- =====================================================
-- 1. PREDICTION MARKETS
-- =====================================================
-- Markets where users can trade on outcomes (yes/no)
-- Categories: world, government, corporate, community, cause

CREATE TABLE IF NOT EXISTS public.prediction_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('world', 'government', 'corporate', 'community', 'cause')),
  subcategory TEXT,
  resolution_criteria TEXT NOT NULL,
  resolution_date TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  verification_sources TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'active', 'trading', 'resolved', 'disputed', 'cancelled')),
  resolved_outcome BOOLEAN,
  resolved_at TIMESTAMPTZ,
  resolution_evidence JSONB DEFAULT '{}',
  current_probability DECIMAL(5,2) NOT NULL DEFAULT 50.00 CHECK (current_probability >= 0 AND current_probability <= 100),
  total_volume DECIMAL(20,2) NOT NULL DEFAULT 0 CHECK (total_volume >= 0),
  fee_percentage DECIMAL(3,2) NOT NULL DEFAULT 2.5 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  conscious_fund_percentage DECIMAL(3,2) NOT NULL DEFAULT 7.5 CHECK (conscious_fund_percentage >= 0 AND conscious_fund_percentage <= 100),
  min_trade DECIMAL(10,2) NOT NULL DEFAULT 10.00 CHECK (min_trade > 0),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'B')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.prediction_markets IS 'Prediction markets for collective consciousness feature';

-- =====================================================
-- 2. PREDICTION TRADES
-- =====================================================
-- Individual trades (buy yes or buy no) on prediction markets

CREATE TABLE IF NOT EXISTS public.prediction_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  amount DECIMAL(20,2) NOT NULL CHECK (amount > 0),
  price DECIMAL(5,4) NOT NULL CHECK (price > 0 AND price < 1),
  fee_amount DECIMAL(20,2) NOT NULL CHECK (fee_amount >= 0),
  conscious_fund_amount DECIMAL(20,2) NOT NULL CHECK (conscious_fund_amount >= 0),
  status TEXT NOT NULL DEFAULT 'filled' CHECK (status IN ('pending', 'filled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.prediction_trades IS 'Individual prediction market trades';

-- =====================================================
-- 3. PREDICTION POSITIONS
-- =====================================================
-- User positions (aggregated shares) per market and side

CREATE TABLE IF NOT EXISTS public.prediction_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  shares DECIMAL(20,4) NOT NULL DEFAULT 0 CHECK (shares >= 0),
  average_price DECIMAL(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, market_id, side)
);

COMMENT ON TABLE public.prediction_positions IS 'User positions in prediction markets';

-- =====================================================
-- 4. PREDICTION WALLETS
-- =====================================================
-- User wallets for prediction trading (separate from main platform wallets)

CREATE TABLE IF NOT EXISTS public.prediction_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(20,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_deposited DECIMAL(20,2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(20,2) NOT NULL DEFAULT 0,
  total_won DECIMAL(20,2) NOT NULL DEFAULT 0,
  total_lost DECIMAL(20,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.prediction_wallets IS 'User wallets for prediction market trading';

-- =====================================================
-- 5. CONSCIOUS FUND
-- =====================================================
-- Single-row table tracking the collective fund from trade fees

CREATE TABLE IF NOT EXISTS public.conscious_fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_collected DECIMAL(20,2) NOT NULL DEFAULT 0,
  total_disbursed DECIMAL(20,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(20,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.conscious_fund IS 'Collective fund from prediction trade fees (transparency)';

-- Insert single row if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conscious_fund) THEN
    INSERT INTO public.conscious_fund (total_collected, total_disbursed, current_balance) VALUES (0, 0, 0);
  END IF;
END $$;

-- =====================================================
-- 6. CONSCIOUS FUND TRANSACTIONS
-- =====================================================
-- Audit trail for conscious fund inflows and outflows

CREATE TABLE IF NOT EXISTS public.conscious_fund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(20,2) NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('trade_fee', 'donation', 'sponsorship')),
  source_id UUID,
  market_id UUID REFERENCES public.prediction_markets(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.conscious_fund_transactions IS 'Audit trail for conscious fund transactions';

-- =====================================================
-- 7. PREDICTION MARKET HISTORY
-- =====================================================
-- Historical probability and volume snapshots for charts

CREATE TABLE IF NOT EXISTS public.prediction_market_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  probability DECIMAL(5,2) NOT NULL CHECK (probability >= 0 AND probability <= 100),
  volume_24h DECIMAL(20,2) NOT NULL DEFAULT 0,
  trade_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.prediction_market_history IS 'Historical probability/volume for market charts';

-- =====================================================
-- 8. AGENT CONTENT
-- =====================================================
-- AI-generated content (news summaries, sentiment, insights)

CREATE TABLE IF NOT EXISTS public.agent_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('news_monitor', 'sentiment_tracker', 'data_watchdog', 'content_creator')),
  content_type TEXT NOT NULL CHECK (content_type IN ('news_summary', 'sentiment_report', 'data_alert', 'social_post', 'weekly_digest', 'market_insight')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  metadata JSONB DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agent_content IS 'AI agent generated content for markets';

-- =====================================================
-- 9. SENTIMENT SCORES
-- =====================================================
-- Sentiment data per market from various sources

CREATE TABLE IF NOT EXISTS public.sentiment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= -100 AND score <= 100),
  source TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  sample_size INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sentiment_scores IS 'Sentiment scores for prediction markets';

-- =====================================================
-- 10. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pred_markets_status ON public.prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_pred_markets_category ON public.prediction_markets(category);
CREATE INDEX IF NOT EXISTS idx_pred_markets_search ON public.prediction_markets USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_pred_markets_resolution_date ON public.prediction_markets(resolution_date);
CREATE INDEX IF NOT EXISTS idx_pred_trades_market ON public.prediction_trades(market_id);
CREATE INDEX IF NOT EXISTS idx_pred_trades_user ON public.prediction_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_trades_created ON public.prediction_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pred_positions_user ON public.prediction_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_positions_market ON public.prediction_positions(market_id);
CREATE INDEX IF NOT EXISTS idx_pred_history_market ON public.prediction_market_history(market_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_content_market ON public.agent_content(market_id);
CREATE INDEX IF NOT EXISTS idx_agent_content_published ON public.agent_content(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_sentiment_market ON public.sentiment_scores(market_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_conscious_fund_tx_created ON public.conscious_fund_transactions(created_at DESC);

-- =====================================================
-- 11. ROW LEVEL SECURITY
-- =====================================================

-- prediction_markets: SELECT for all authenticated, INSERT/UPDATE for admins only
ALTER TABLE public.prediction_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view prediction markets" ON public.prediction_markets;
CREATE POLICY "Authenticated can view prediction markets" ON public.prediction_markets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert prediction markets" ON public.prediction_markets;
CREATE POLICY "Admins can insert prediction markets" ON public.prediction_markets
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update prediction markets" ON public.prediction_markets;
CREATE POLICY "Admins can update prediction markets" ON public.prediction_markets
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- prediction_trades: SELECT own trades only, INSERT for authenticated
ALTER TABLE public.prediction_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prediction trades" ON public.prediction_trades;
CREATE POLICY "Users can view own prediction trades" ON public.prediction_trades
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated can insert prediction trades" ON public.prediction_trades;
CREATE POLICY "Authenticated can insert prediction trades" ON public.prediction_trades
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- prediction_positions: SELECT own positions only
ALTER TABLE public.prediction_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prediction positions" ON public.prediction_positions;
CREATE POLICY "Users can view own prediction positions" ON public.prediction_positions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage prediction positions" ON public.prediction_positions;
CREATE POLICY "System can manage prediction positions" ON public.prediction_positions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- prediction_wallets: SELECT/UPDATE own wallet only
ALTER TABLE public.prediction_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prediction wallet" ON public.prediction_wallets;
CREATE POLICY "Users can view own prediction wallet" ON public.prediction_wallets
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own prediction wallet" ON public.prediction_wallets;
CREATE POLICY "Users can update own prediction wallet" ON public.prediction_wallets
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own prediction wallet" ON public.prediction_wallets;
CREATE POLICY "Users can insert own prediction wallet" ON public.prediction_wallets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- conscious_fund: SELECT for all authenticated (transparency)
ALTER TABLE public.conscious_fund ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view conscious fund" ON public.conscious_fund;
CREATE POLICY "Authenticated can view conscious fund" ON public.conscious_fund
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- conscious_fund_transactions: SELECT for all authenticated
ALTER TABLE public.conscious_fund_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view conscious fund transactions" ON public.conscious_fund_transactions;
CREATE POLICY "Authenticated can view conscious fund transactions" ON public.conscious_fund_transactions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- prediction_market_history: SELECT for all authenticated
ALTER TABLE public.prediction_market_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view prediction market history" ON public.prediction_market_history;
CREATE POLICY "Authenticated can view prediction market history" ON public.prediction_market_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- agent_content: SELECT for authenticated where published = true
ALTER TABLE public.agent_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view published agent content" ON public.agent_content;
CREATE POLICY "Authenticated can view published agent content" ON public.agent_content
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND published = true);

-- sentiment_scores: SELECT for all authenticated
ALTER TABLE public.sentiment_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view sentiment scores" ON public.sentiment_scores;
CREATE POLICY "Authenticated can view sentiment scores" ON public.sentiment_scores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 12. FUNCTIONS
-- =====================================================

-- get_or_create_prediction_wallet: Returns wallet, creates if not exists
CREATE OR REPLACE FUNCTION public.get_or_create_prediction_wallet(p_user_id UUID)
RETURNS public.prediction_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.prediction_wallets;
BEGIN
  SELECT * INTO v_wallet
  FROM public.prediction_wallets
  WHERE user_id = p_user_id;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.prediction_wallets (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_wallet;
  END IF;

  RETURN v_wallet;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_prediction_wallet IS 'Get or create prediction wallet for user';

-- execute_prediction_trade: Execute a trade with AMM-style pricing
CREATE OR REPLACE FUNCTION public.execute_prediction_trade(
  p_user_id UUID,
  p_market_id UUID,
  p_side TEXT,
  p_amount DECIMAL
)
RETURNS public.prediction_trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_wallet public.prediction_wallets%ROWTYPE;
  v_price DECIMAL(5,4);
  v_shares DECIMAL(20,4);
  v_fee DECIMAL(20,2);
  v_conscious DECIMAL(20,2);
  v_total_cost DECIMAL(20,2);
  v_trade public.prediction_trades%ROWTYPE;
BEGIN
  -- Validate caller can only trade for themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot trade for another user';
  END IF;

  -- Validate side
  IF p_side NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Invalid side: %', p_side;
  END IF;

  -- Get market
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.status NOT IN ('active', 'trading') THEN
    RAISE EXCEPTION 'Market is not open for trading';
  END IF;

  IF p_amount < v_market.min_trade THEN
    RAISE EXCEPTION 'Amount below minimum trade of %', v_market.min_trade;
  END IF;

  -- Get or create wallet
  SELECT * INTO v_wallet FROM public.get_or_create_prediction_wallet(p_user_id);

  -- Price: use current probability as decimal (yes = probability/100, no = (100-probability)/100)
  IF p_side = 'yes' THEN
    v_price := v_market.current_probability / 100.0;
  ELSE
    v_price := (100.0 - v_market.current_probability) / 100.0;
  END IF;

  -- Ensure price is in valid range
  v_price := GREATEST(0.0001, LEAST(0.9999, v_price));

  -- Calculate shares, fee, conscious fund
  v_shares := p_amount / v_price;
  v_fee := p_amount * (v_market.fee_percentage / 100.0);
  v_conscious := p_amount * (v_market.conscious_fund_percentage / 100.0);
  v_total_cost := p_amount + v_fee + v_conscious;

  IF v_wallet.balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Need %, have %', v_total_cost, v_wallet.balance;
  END IF;

  -- Deduct from wallet
  UPDATE public.prediction_wallets
  SET balance = balance - v_total_cost,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Create trade record
  INSERT INTO public.prediction_trades (market_id, user_id, side, amount, price, fee_amount, conscious_fund_amount, status)
  VALUES (p_market_id, p_user_id, p_side, p_amount, v_price, v_fee, v_conscious, 'filled')
  RETURNING * INTO v_trade;

  -- Upsert position
  INSERT INTO public.prediction_positions (user_id, market_id, side, shares, average_price)
  VALUES (p_user_id, p_market_id, p_side, v_shares, v_price)
  ON CONFLICT (user_id, market_id, side) DO UPDATE
  SET
    shares = public.prediction_positions.shares + v_shares,
    average_price = (
      (public.prediction_positions.average_price * public.prediction_positions.shares + v_price * v_shares) /
      (public.prediction_positions.shares + v_shares)
    ),
    updated_at = NOW();

  -- Update market volume and probability (simple volume-weighted shift)
  UPDATE public.prediction_markets
  SET
    total_volume = total_volume + p_amount,
    current_probability = CASE
      WHEN p_side = 'yes' THEN LEAST(99, current_probability + 0.5)
      ELSE GREATEST(1, current_probability - 0.5)
    END,
    updated_at = NOW()
  WHERE id = p_market_id;

  -- Insert conscious fund transaction
  INSERT INTO public.conscious_fund_transactions (amount, source_type, source_id, market_id, description)
  VALUES (v_conscious, 'trade_fee', v_trade.id, p_market_id, 'Trade fee from prediction');

  -- Update conscious fund totals
  UPDATE public.conscious_fund
  SET
    total_collected = total_collected + v_conscious,
    current_balance = current_balance + v_conscious,
    updated_at = NOW();

  RETURN v_trade;
END;
$$;

COMMENT ON FUNCTION public.execute_prediction_trade IS 'Execute a prediction market trade';

-- resolve_prediction_market: Resolve market and pay out winners
CREATE OR REPLACE FUNCTION public.resolve_prediction_market(
  p_market_id UUID,
  p_outcome BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_position RECORD;
  v_payout DECIMAL(20,2);
  v_winning_side TEXT;
BEGIN
  -- Only admins can resolve markets
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve prediction markets';
  END IF;

  -- Get market
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.status = 'resolved' THEN
    RAISE EXCEPTION 'Market already resolved';
  END IF;

  -- Winning side: TRUE = yes wins, FALSE = no wins
  v_winning_side := CASE WHEN p_outcome THEN 'yes' ELSE 'no' END;

  -- Update market status
  UPDATE public.prediction_markets
  SET
    status = 'resolved',
    resolved_outcome = p_outcome,
    resolved_at = NOW(),
    resolution_evidence = jsonb_build_object('resolved_by', 'admin', 'resolved_at', NOW()),
    updated_at = NOW()
  WHERE id = p_market_id;

  -- Payout to winning positions (each share pays 1.0)
  FOR v_position IN
    SELECT * FROM public.prediction_positions
    WHERE market_id = p_market_id AND side = v_winning_side AND shares > 0
  LOOP
    v_payout := v_position.shares * 1.0;

    -- Credit wallet
    UPDATE public.prediction_wallets
    SET
      balance = balance + v_payout,
      total_won = total_won + v_payout,
      updated_at = NOW()
    WHERE user_id = v_position.user_id;
  END LOOP;

  -- Zero out all positions (market resolved)
  UPDATE public.prediction_positions
  SET shares = 0, updated_at = NOW()
  WHERE market_id = p_market_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_prediction_market IS 'Resolve a prediction market and pay out winners';

-- =====================================================
-- 13. TRIGGER: Record market history after trade
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_prediction_trade_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_probability DECIMAL(5,2);
  v_volume_24h DECIMAL(20,2);
  v_trade_count INTEGER;
BEGIN
  SELECT current_probability, total_volume INTO v_probability, v_volume_24h
  FROM public.prediction_markets
  WHERE id = NEW.market_id;

  SELECT COUNT(*)::INTEGER INTO v_trade_count
  FROM public.prediction_trades
  WHERE market_id = NEW.market_id
    AND created_at >= NOW() - INTERVAL '24 hours';

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (NEW.market_id, v_probability, COALESCE(v_volume_24h, 0), v_trade_count);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prediction_trade_history ON public.prediction_trades;
CREATE TRIGGER trg_prediction_trade_history
  AFTER INSERT ON public.prediction_trades
  FOR EACH ROW
  WHEN (NEW.status = 'filled')
  EXECUTE FUNCTION public.trigger_prediction_trade_history();

-- =====================================================
-- 14. UPDATED_AT TRIGGER FOR PREDICTION_MARKETS
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_prediction_markets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prediction_markets_updated_at ON public.prediction_markets;
CREATE TRIGGER trg_prediction_markets_updated_at
  BEFORE UPDATE ON public.prediction_markets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_prediction_markets_updated_at();

-- =====================================================
-- END OF MIGRATION 119
-- =====================================================
