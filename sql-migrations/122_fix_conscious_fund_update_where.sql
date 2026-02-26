-- Fix: execute_prediction_trade UPDATE on conscious_fund requires WHERE clause (Supabase safety)
-- The conscious_fund table is a singleton; we target the single row explicitly.

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

  IF p_side = 'yes' THEN
    v_price := v_market.current_probability / 100.0;
  ELSE
    v_price := (100.0 - v_market.current_probability) / 100.0;
  END IF;

  v_price := GREATEST(0.0001, LEAST(0.9999, v_price));

  v_shares := p_amount / v_price;
  v_fee := p_amount * (v_market.fee_percentage / 100.0);
  v_conscious := p_amount * (v_market.conscious_fund_percentage / 100.0);
  v_total_cost := p_amount + v_fee + v_conscious;

  IF v_wallet.balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Need %, have %', v_total_cost, v_wallet.balance;
  END IF;

  UPDATE public.prediction_wallets
  SET balance = balance - v_total_cost,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.prediction_trades (market_id, user_id, side, amount, price, fee_amount, conscious_fund_amount, status)
  VALUES (p_market_id, p_user_id, p_side, p_amount, v_price, v_fee, v_conscious, 'filled')
  RETURNING * INTO v_trade;

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

  UPDATE public.prediction_markets
  SET
    total_volume = total_volume + p_amount,
    current_probability = CASE
      WHEN p_side = 'yes' THEN LEAST(99, current_probability + 0.5)
      ELSE GREATEST(1, current_probability - 0.5)
    END,
    updated_at = NOW()
  WHERE id = p_market_id;

  INSERT INTO public.conscious_fund_transactions (amount, source_type, source_id, market_id, description)
  VALUES (v_conscious, 'trade_fee', v_trade.id, p_market_id, 'Trade fee from prediction');

  -- FIX: Add WHERE clause (Supabase requires it for UPDATE)
  UPDATE public.conscious_fund
  SET
    total_collected = total_collected + v_conscious,
    current_balance = current_balance + v_conscious,
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.conscious_fund LIMIT 1);

  RETURN v_trade;
END;
$$;
