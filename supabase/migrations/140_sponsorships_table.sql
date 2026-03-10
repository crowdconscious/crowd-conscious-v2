-- ============================================================
-- 140: Sponsorships table for full sponsor lifecycle
-- ============================================================
-- Supports: market (starter), category, impact, patron (founding) tiers

CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Payment info
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_mxn NUMERIC(10,2) NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('market', 'category', 'impact', 'patron')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'active', 'expired', 'cancelled')),

  -- Sponsor info
  sponsor_name TEXT NOT NULL,
  sponsor_email TEXT NOT NULL,
  sponsor_url TEXT,
  sponsor_logo_url TEXT,

  -- What they're sponsoring
  market_id UUID REFERENCES prediction_markets(id),
  category TEXT,

  -- Fund allocation
  fund_amount NUMERIC(10,2),
  platform_amount NUMERIC(10,2),

  -- Dates
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add sponsor_id to prediction_markets (after sponsorships exists)
ALTER TABLE prediction_markets ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES sponsorships(id);

-- Ensure sponsor columns exist (126, 129 already add these)
ALTER TABLE prediction_markets ADD COLUMN IF NOT EXISTS sponsor_name TEXT;
ALTER TABLE prediction_markets ADD COLUMN IF NOT EXISTS sponsor_logo_url TEXT;
ALTER TABLE prediction_markets ADD COLUMN IF NOT EXISTS sponsor_url TEXT;

-- RLS
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active sponsorships" ON sponsorships;
CREATE POLICY "Public can read active sponsorships" ON sponsorships
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admin full access sponsorships" ON sponsorships;
CREATE POLICY "Admin full access sponsorships" ON sponsorships
  FOR ALL USING (public.is_admin());

-- Service role bypasses RLS; anon/authenticated need policies
DROP POLICY IF EXISTS "Service role insert sponsorships" ON sponsorships;
-- Allow inserts from service role (bypasses RLS) - no policy needed
-- Allow anon to read for public display - we have "Public can read active"
-- Admins use is_admin()

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sponsorships_market ON sponsorships(market_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_category ON sponsorships(category);
CREATE INDEX IF NOT EXISTS idx_sponsorships_stripe_session ON sponsorships(stripe_session_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_sponsorships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sponsorships_updated_at ON sponsorships;
CREATE TRIGGER sponsorships_updated_at
  BEFORE UPDATE ON sponsorships
  FOR EACH ROW EXECUTE FUNCTION update_sponsorships_updated_at();
