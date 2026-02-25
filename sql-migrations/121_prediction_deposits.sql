-- =====================================================
-- 121: PREDICTION DEPOSITS (Idempotency for Stripe webhook)
-- =====================================================
-- Tracks Stripe payment intents for prediction wallet deposits.
-- Used for idempotency: webhook checks this table before crediting.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prediction_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.prediction_wallets(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(20,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.prediction_deposits IS 'Tracks Stripe deposits to prediction wallets (idempotency)';

CREATE INDEX IF NOT EXISTS idx_prediction_deposits_stripe_id ON public.prediction_deposits(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_prediction_deposits_user ON public.prediction_deposits(user_id);

ALTER TABLE public.prediction_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prediction deposits" ON public.prediction_deposits;
CREATE POLICY "Users can view own prediction deposits" ON public.prediction_deposits
  FOR SELECT
  USING (user_id = auth.uid());

-- No INSERT policy for users; webhook uses service role (bypasses RLS)
