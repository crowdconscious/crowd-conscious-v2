-- =====================================================
-- 120: PREDICTION XP REWARDS & ANONYMIZED TRADES
-- =====================================================

-- Add prediction_trade and prediction_first_trade to xp_rewards
INSERT INTO public.xp_rewards (action_type, xp_amount, description) VALUES
  ('prediction_trade', 25, 'Traded on a prediction market'),
  ('prediction_first_trade', 50, 'Made your first prediction trade')
ON CONFLICT (action_type) DO UPDATE SET
  xp_amount = EXCLUDED.xp_amount,
  description = EXCLUDED.description;

-- RPC to get anonymized trades for a market (for activity feed)
CREATE OR REPLACE FUNCTION public.get_market_trades_anon(p_market_id UUID)
RETURNS TABLE (
  side TEXT,
  amount DECIMAL,
  price DECIMAL,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.side, t.amount, t.price, t.created_at
  FROM public.prediction_trades t
  WHERE t.market_id = p_market_id
    AND t.status = 'filled'
  ORDER BY t.created_at DESC
  LIMIT 20;
$$;

COMMENT ON FUNCTION public.get_market_trades_anon IS 'Get anonymized recent trades for market activity feed';
