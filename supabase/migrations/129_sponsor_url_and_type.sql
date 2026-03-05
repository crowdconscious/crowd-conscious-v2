-- ============================================================
-- 129: Add sponsor_url and sponsor_type to prediction_markets
-- ============================================================

ALTER TABLE public.prediction_markets
ADD COLUMN IF NOT EXISTS sponsor_url text,
ADD COLUMN IF NOT EXISTS sponsor_type text DEFAULT 'business';

-- Add check constraint for sponsor_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prediction_markets_sponsor_type_check'
  ) THEN
    ALTER TABLE public.prediction_markets
    ADD CONSTRAINT prediction_markets_sponsor_type_check
    CHECK (sponsor_type IS NULL OR sponsor_type IN ('business', 'individual', 'influencer'));
  END IF;
END $$;
