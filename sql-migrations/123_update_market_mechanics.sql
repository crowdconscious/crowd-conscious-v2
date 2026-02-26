-- =====================================================
-- 123: UPDATE MARKET MECHANICS
-- =====================================================
-- $10 share basis: YES price = (prob/100)*10, NO price = 10 - YES price
-- Fees deducted from trade amount; net buys shares
-- Probability adjusts via constant product, clamped ±5% per trade
-- Payout on resolution: shares × $10 MXN
-- =====================================================

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
  v_price DECIMAL(5,4);  -- 0-1 for DB (prob/100)
  v_price_per_share_mxn DECIMAL(10,2);  -- $10 share basis
  v_shares DECIMAL(20,4);
  v_fee DECIMAL(20,2);
  v_conscious DECIMAL(20,2);
  v_net_amount DECIMAL(20,2);
  v_total_cost DECIMAL(20,2);
  v_trade public.prediction_trades%ROWTYPE;
  v_new_prob DECIMAL(5,2);
  v_adjustment DECIMAL(10,4);
  v_liquidity DECIMAL(20,2);
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot trade for another user';
  END IF;

  IF p_side NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Invalid side: %', p_side;
  END IF;

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

  SELECT * INTO v_wallet FROM public.get_or_create_prediction_wallet(p_user_id);

  -- Fees deducted from amount (platform + conscious fund)
  v_fee := p_amount * (v_market.fee_percentage / 100.0);
  v_conscious := p_amount * (v_market.conscious_fund_percentage / 100.0);
  v_net_amount := p_amount - v_fee - v_conscious;
  v_total_cost := p_amount;  -- User pays full amount

  -- Price per share: $10 basis. YES = prob/100*10, NO = (100-prob)/100*10
  IF p_side = 'yes' THEN
    v_price_per_share_mxn := (v_market.current_probability / 100.0) * 10.0;
    v_price := v_market.current_probability / 100.0;
  ELSE
    v_price_per_share_mxn := ((100.0 - v_market.current_probability) / 100.0) * 10.0;
    v_price := (100.0 - v_market.current_probability) / 100.0;
  END IF;

  v_price_per_share_mxn := GREATEST(0.10, LEAST(9.90, v_price_per_share_mxn));
  v_price := GREATEST(0.01, LEAST(0.99, v_price));

  v_shares := v_net_amount / v_price_per_share_mxn;

  IF v_wallet.balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Need %, have %', v_total_cost, v_wallet.balance;
  END IF;

  -- Deduct from wallet
  UPDATE public.prediction_wallets
  SET balance = balance - v_total_cost,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Create trade record (price stored as 0-1 decimal)
  INSERT INTO public.prediction_trades (market_id, user_id, side, amount, price, fee_amount, conscious_fund_amount, status)
  VALUES (p_market_id, p_user_id, p_side, p_amount, v_price, v_fee, v_conscious, 'filled')
  RETURNING * INTO v_trade;

  -- Upsert position (shares, average_price in $10 basis)
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

  -- Update market volume
  UPDATE public.prediction_markets
  SET total_volume = total_volume + p_amount,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- Probability update: constant product, clamped ±5% per trade
  v_liquidity := v_market.total_volume + p_amount + 1000.0;
  v_adjustment := (p_amount / v_liquidity) * 100.0;
  v_adjustment := LEAST(5.0, GREATEST(-5.0, v_adjustment));

  IF p_side = 'yes' THEN
    v_new_prob := v_market.current_probability + v_adjustment;
  ELSE
    v_new_prob := v_market.current_probability - v_adjustment;
  END IF;

  v_new_prob := LEAST(99.0, GREATEST(1.0, v_new_prob));

  UPDATE public.prediction_markets
  SET current_probability = v_new_prob,
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
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.conscious_fund LIMIT 1);

  RETURN v_trade;
END;
$$;

-- Fix resolve: payout = shares × $10 MXN (not $1)
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
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve prediction markets';
  END IF;

  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.status = 'resolved' THEN
    RAISE EXCEPTION 'Market already resolved';
  END IF;

  v_winning_side := CASE WHEN p_outcome THEN 'yes' ELSE 'no' END;

  UPDATE public.prediction_markets
  SET
    status = 'resolved',
    resolved_outcome = p_outcome,
    resolved_at = NOW(),
    resolution_evidence = jsonb_build_object('resolved_by', 'admin', 'resolved_at', NOW()),
    updated_at = NOW()
  WHERE id = p_market_id;

  -- Payout: each share pays $10 MXN
  FOR v_position IN
    SELECT * FROM public.prediction_positions
    WHERE market_id = p_market_id AND side = v_winning_side AND shares > 0
  LOOP
    v_payout := v_position.shares * 10.0;

    UPDATE public.prediction_wallets
    SET
      balance = balance + v_payout,
      total_won = total_won + v_payout,
      updated_at = NOW()
    WHERE user_id = v_position.user_id;
  END LOOP;

  UPDATE public.prediction_positions
  SET shares = 0, updated_at = NOW()
  WHERE market_id = p_market_id;
END;
$$;

-- Update get_market_trades_anon to return shares and price in MXN
CREATE OR REPLACE FUNCTION public.get_market_trades_anon(p_market_id UUID)
RETURNS TABLE (
  side TEXT,
  amount DECIMAL,
  price DECIMAL,
  fee_amount DECIMAL,
  conscious_fund_amount DECIMAL,
  shares DECIMAL,
  price_per_share_mxn DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.side,
    t.amount,
    t.price,
    t.fee_amount,
    t.conscious_fund_amount,
    (t.amount - t.fee_amount - t.conscious_fund_amount) / NULLIF(t.price * 10, 0) AS shares,
    t.price * 10 AS price_per_share_mxn,
    t.created_at
  FROM public.prediction_trades t
  WHERE t.market_id = p_market_id
    AND t.status = 'filled'
  ORDER BY t.created_at DESC
  LIMIT 20;
$$;
