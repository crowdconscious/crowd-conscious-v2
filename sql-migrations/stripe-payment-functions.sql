-- Create function to increment content funding atomically
CREATE OR REPLACE FUNCTION increment_funding(content_id UUID, amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE community_content 
  SET current_funding = current_funding + amount
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sponsorships table to include payment tracking
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT,
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update sponsorships status enum to include payment states
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sponsorship_status_new') THEN
    CREATE TYPE sponsorship_status_new AS ENUM (
      'pending', 
      'approved', 
      'rejected', 
      'payment_pending',
      'paid',
      'failed'
    );
    
    -- Add new column with new type
    ALTER TABLE sponsorships ADD COLUMN status_new sponsorship_status_new;
    
    -- Copy data from old column to new column
    UPDATE sponsorships SET status_new = 
      CASE 
        WHEN status = 'pending' THEN 'pending'::sponsorship_status_new
        WHEN status = 'approved' THEN 'approved'::sponsorship_status_new
        WHEN status = 'rejected' THEN 'rejected'::sponsorship_status_new
        WHEN status = 'paid' THEN 'paid'::sponsorship_status_new
        ELSE 'pending'::sponsorship_status_new
      END;
    
    -- Drop old column and rename new column
    ALTER TABLE sponsorships DROP COLUMN status;
    ALTER TABLE sponsorships RENAME COLUMN status_new TO status;
    
    -- Drop old type
    DROP TYPE IF EXISTS sponsorship_status;
    
    -- Rename new type
    ALTER TYPE sponsorship_status_new RENAME TO sponsorship_status;
  END IF;
END $$;

-- Add index for payment intent lookups
CREATE INDEX IF NOT EXISTS idx_sponsorships_payment_intent ON sponsorships(stripe_payment_intent);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sponsorship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.payment_date = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sponsorship_timestamp ON sponsorships;
CREATE TRIGGER trg_sponsorship_timestamp
  BEFORE UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsorship_timestamp();

-- Create payment_transactions table for audit trail
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id UUID REFERENCES sponsorships(id) ON DELETE CASCADE,
  stripe_payment_intent TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  platform_fee DECIMAL NOT NULL,
  net_amount DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  stripe_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for payment transactions (admin and involved parties only)
DROP POLICY IF EXISTS "Admin and involved parties can view payment transactions" ON payment_transactions;
CREATE POLICY "Admin and involved parties can view payment transactions" ON payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'
    ) OR EXISTS (
      SELECT 1 FROM sponsorships s 
      WHERE s.id = payment_transactions.sponsorship_id 
      AND s.sponsor_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_sponsorship ON payment_transactions(sponsorship_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent ON payment_transactions(stripe_payment_intent);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
