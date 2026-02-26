-- =====================================================
-- 124: MARKET RESOLUTION SYSTEM
-- =====================================================
-- Cancel market function, update resolve to accept evidence
-- Add market_resolved notification type
-- =====================================================

-- Add market_resolved to notifications type (drop and recreate constraint)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'vote', 'content_approved', 'event_rsvp', 'community_invite', 'content_created',
    'funding_milestone', 'activity_completed', 'market_resolved'
  )
);

-- Update resolve_prediction_market to accept evidence_url and admin_notes
CREATE OR REPLACE FUNCTION public.resolve_prediction_market(
  p_market_id UUID,
  p_outcome BOOLEAN,
  p_evidence_url TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
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
    resolution_evidence = jsonb_build_object(
      'resolved_by', auth.uid(),
      'resolved_at', NOW(),
      'evidence_url', COALESCE(p_evidence_url, ''),
      'admin_notes', COALESCE(p_admin_notes, '')
    ),
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

-- Cancel market: refund all traders at average cost, set status = cancelled
CREATE OR REPLACE FUNCTION public.cancel_prediction_market(
  p_market_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_position RECORD;
  v_refund DECIMAL(20,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Only admins can cancel prediction markets';
  END IF;

  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.status IN ('resolved', 'cancelled') THEN
    RAISE EXCEPTION 'Market cannot be cancelled';
  END IF;

  -- Refund each position: shares * avg_price * 10 (cost basis in MXN)
  FOR v_position IN
    SELECT * FROM public.prediction_positions
    WHERE market_id = p_market_id AND shares > 0
  LOOP
    v_refund := v_position.shares * COALESCE(v_position.average_price, 0.5) * 10.0;

    UPDATE public.prediction_wallets
    SET
      balance = balance + v_refund,
      updated_at = NOW()
    WHERE user_id = v_position.user_id;
  END LOOP;

  UPDATE public.prediction_positions
  SET shares = 0, updated_at = NOW()
  WHERE market_id = p_market_id;

  UPDATE public.prediction_markets
  SET
    status = 'cancelled',
    resolution_evidence = jsonb_build_object(
      'cancelled_by', auth.uid(),
      'cancelled_at', NOW(),
      'reason', COALESCE(p_reason, '')
    ),
    updated_at = NOW()
  WHERE id = p_market_id;
END;
$$;
