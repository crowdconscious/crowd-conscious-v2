-- Community Treasury/Pool System
-- Allows communities to have a shared fund that members can donate to
-- Communities can then use these funds to sponsor needs

-- Create community_treasury table to track the pool balance
CREATE TABLE IF NOT EXISTS public.community_treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance decimal(10, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
  total_donations decimal(10, 2) DEFAULT 0.00 NOT NULL,
  total_spent decimal(10, 2) DEFAULT 0.00 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT balance_matches_totals CHECK (balance = total_donations - total_spent)
);

-- Create treasury_transactions table to track all donations and spending
CREATE TABLE IF NOT EXISTS public.treasury_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('donation', 'sponsorship', 'withdrawal')),
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  
  -- For donations
  donor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  donor_email text,
  donor_name text,
  
  -- For sponsorships (spending from pool)
  sponsored_content_id uuid REFERENCES public.community_content(id) ON DELETE SET NULL,
  sponsorship_id uuid REFERENCES public.sponsorships(id) ON DELETE SET NULL,
  
  -- General
  description text,
  stripe_payment_intent_id text,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_treasury_community ON public.community_treasury(community_id);
CREATE INDEX IF NOT EXISTS idx_transactions_community ON public.treasury_transactions(community_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.treasury_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_donor ON public.treasury_transactions(donor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.treasury_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.community_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_treasury
-- Anyone can view treasury balance for communities they're members of
CREATE POLICY "Community members can view treasury" ON public.community_treasury
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = community_treasury.community_id
    AND user_id = auth.uid()
  )
);

-- Only community admins can update treasury (via functions)
CREATE POLICY "Community admins can manage treasury" ON public.community_treasury
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = community_treasury.community_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- RLS Policies for treasury_transactions
-- Community members can view transactions
CREATE POLICY "Community members can view transactions" ON public.treasury_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = treasury_transactions.community_id
    AND user_id = auth.uid()
  )
);

-- Authenticated users can insert donations
CREATE POLICY "Authenticated users can donate" ON public.treasury_transactions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND transaction_type = 'donation'
);

-- Community admins can insert sponsorships (spending)
CREATE POLICY "Community admins can spend from treasury" ON public.treasury_transactions
FOR INSERT WITH CHECK (
  transaction_type IN ('sponsorship', 'withdrawal')
  AND EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = treasury_transactions.community_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Function to initialize treasury for a community
CREATE OR REPLACE FUNCTION initialize_community_treasury(p_community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.community_treasury (community_id, balance, total_donations, total_spent)
  VALUES (p_community_id, 0, 0, 0)
  ON CONFLICT (community_id) DO NOTHING;
END;
$$;

-- Function to add donation to treasury
CREATE OR REPLACE FUNCTION add_treasury_donation(
  p_community_id uuid,
  p_amount decimal,
  p_donor_id uuid,
  p_donor_email text DEFAULT NULL,
  p_donor_name text DEFAULT NULL,
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  -- Ensure treasury exists
  INSERT INTO public.community_treasury (community_id, balance, total_donations, total_spent)
  VALUES (p_community_id, 0, 0, 0)
  ON CONFLICT (community_id) DO NOTHING;
  
  -- Create transaction record
  INSERT INTO public.treasury_transactions (
    community_id,
    transaction_type,
    amount,
    donor_id,
    donor_email,
    donor_name,
    description,
    stripe_payment_intent_id,
    status,
    created_by
  ) VALUES (
    p_community_id,
    'donation',
    p_amount,
    p_donor_id,
    p_donor_email,
    p_donor_name,
    COALESCE(p_description, 'Donation to community pool'),
    p_stripe_payment_intent_id,
    'completed',
    p_donor_id
  ) RETURNING id INTO v_transaction_id;
  
  -- Update treasury balance
  UPDATE public.community_treasury
  SET 
    balance = balance + p_amount,
    total_donations = total_donations + p_amount,
    updated_at = now()
  WHERE community_id = p_community_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Function to spend from treasury for sponsorships
CREATE OR REPLACE FUNCTION spend_from_treasury(
  p_community_id uuid,
  p_amount decimal,
  p_sponsored_content_id uuid,
  p_sponsorship_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
  v_current_balance decimal;
BEGIN
  -- Check current balance
  SELECT balance INTO v_current_balance
  FROM public.community_treasury
  WHERE community_id = p_community_id;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Community treasury not found';
  END IF;
  
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds in treasury. Balance: %, Required: %', v_current_balance, p_amount;
  END IF;
  
  -- Create transaction record
  INSERT INTO public.treasury_transactions (
    community_id,
    transaction_type,
    amount,
    sponsored_content_id,
    sponsorship_id,
    description,
    status,
    created_by
  ) VALUES (
    p_community_id,
    'sponsorship',
    p_amount,
    p_sponsored_content_id,
    p_sponsorship_id,
    COALESCE(p_description, 'Sponsorship from community pool'),
    'completed',
    COALESCE(p_created_by, auth.uid())
  ) RETURNING id INTO v_transaction_id;
  
  -- Update treasury balance
  UPDATE public.community_treasury
  SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = now()
  WHERE community_id = p_community_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Function to get treasury stats
CREATE OR REPLACE FUNCTION get_treasury_stats(p_community_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'balance', COALESCE(ct.balance, 0),
    'total_donations', COALESCE(ct.total_donations, 0),
    'total_spent', COALESCE(ct.total_spent, 0),
    'donation_count', (
      SELECT COUNT(*) 
      FROM public.treasury_transactions 
      WHERE community_id = p_community_id 
      AND transaction_type = 'donation'
      AND status = 'completed'
    ),
    'sponsorship_count', (
      SELECT COUNT(*) 
      FROM public.treasury_transactions 
      WHERE community_id = p_community_id 
      AND transaction_type = 'sponsorship'
      AND status = 'completed'
    ),
    'recent_transactions', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', tt.id,
          'type', tt.transaction_type,
          'amount', tt.amount,
          'description', tt.description,
          'created_at', tt.created_at,
          'donor_name', tt.donor_name
        ) ORDER BY tt.created_at DESC
      ), '[]'::json)
      FROM (
        SELECT * FROM public.treasury_transactions
        WHERE community_id = p_community_id
        AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 10
      ) tt
    )
  ) INTO v_result
  FROM public.community_treasury ct
  WHERE ct.community_id = p_community_id;
  
  RETURN COALESCE(v_result, json_build_object(
    'balance', 0,
    'total_donations', 0,
    'total_spent', 0,
    'donation_count', 0,
    'sponsorship_count', 0,
    'recent_transactions', '[]'::json
  ));
END;
$$;

-- Trigger to automatically create treasury when community is created
CREATE OR REPLACE FUNCTION create_treasury_for_community()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.community_treasury (community_id, balance, total_donations, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (community_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_treasury
AFTER INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION create_treasury_for_community();

-- Comments
COMMENT ON TABLE public.community_treasury IS 'Tracks the treasury/pool balance for each community';
COMMENT ON TABLE public.treasury_transactions IS 'Records all donations and spending from community treasuries';
COMMENT ON FUNCTION add_treasury_donation IS 'Adds a donation to the community treasury';
COMMENT ON FUNCTION spend_from_treasury IS 'Spends from treasury for sponsorships';
COMMENT ON FUNCTION get_treasury_stats IS 'Gets treasury statistics and recent transactions';

