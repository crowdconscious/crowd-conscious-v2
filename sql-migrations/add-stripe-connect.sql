-- Add Stripe Connect fields for marketplace payments
-- This enables community founders to receive payments directly

-- Add Stripe Connect fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Add Stripe account to communities (links to founder's account)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Add platform fee tracking to sponsorships
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10, 2);
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS founder_amount DECIMAL(10, 2);
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON profiles(stripe_connect_id);
CREATE INDEX IF NOT EXISTS idx_communities_stripe_account ON communities(stripe_account_id);

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_connect_id IS 'Stripe Connect account ID for receiving payments';
COMMENT ON COLUMN profiles.stripe_onboarding_complete IS 'Whether user completed Stripe Connect onboarding';
COMMENT ON COLUMN profiles.stripe_charges_enabled IS 'Whether Stripe account can accept charges';
COMMENT ON COLUMN profiles.stripe_payouts_enabled IS 'Whether Stripe account can receive payouts';
COMMENT ON COLUMN communities.stripe_account_id IS 'Stripe Connect account ID of community founder';
COMMENT ON COLUMN sponsorships.platform_fee_amount IS 'Platform fee (15%) in MXN';
COMMENT ON COLUMN sponsorships.founder_amount IS 'Amount transferred to founder (85%) in MXN';
COMMENT ON COLUMN sponsorships.stripe_transfer_id IS 'Stripe transfer ID for founder payout';

