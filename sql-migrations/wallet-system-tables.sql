-- =====================================================
-- WALLET SYSTEM TABLES
-- Purpose: Enable revenue distribution from marketplace sales
-- Revenue Split: Platform (30%), Community (50%), Creator (20%)
-- Optional: Creator can donate 20% to community (total 70% community)
-- =====================================================

-- WALLETS TABLE
-- Stores balance for communities, users (creators), and platform
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('community', 'user', 'platform')),
  owner_id UUID, -- community_id, user_id, or NULL for platform treasury
  balance NUMERIC(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT DEFAULT 'MXN',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one wallet per owner
  UNIQUE(owner_type, owner_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);

-- RLS Policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Community admins can see their community wallet
CREATE POLICY "Community admins can view their wallet" ON wallets
  FOR SELECT
  USING (
    owner_type = 'community' 
    AND owner_id IN (
      SELECT community_id FROM communities
      WHERE admin_id = auth.uid()
    )
  );

-- Creators can see their personal wallet
CREATE POLICY "Creators can view their wallet" ON wallets
  FOR SELECT
  USING (
    owner_type = 'user' 
    AND owner_id = auth.uid()
  );

-- Super admins can see all wallets
CREATE POLICY "Super admins can view all wallets" ON wallets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- WALLET TRANSACTIONS TABLE
-- Tracks all credits and debits to wallets
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  
  -- Source tracking
  source TEXT NOT NULL, -- 'module_sale', 'withdrawal', 'need_sponsorship', 'creator_donation', etc.
  source_id UUID, -- marketplace_module_id, need_id, withdrawal_request_id, etc.
  
  -- Description and metadata
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Store additional context (module name, corporate account, etc.)
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  
  -- Balance snapshot (for reconciliation)
  balance_before NUMERIC(10, 2),
  balance_after NUMERIC(10, 2),
  
  -- Related transaction (for reversals)
  related_transaction_id UUID REFERENCES wallet_transactions(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_source ON wallet_transactions(source, source_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see transactions for their wallets
CREATE POLICY "Users can view their wallet transactions" ON wallet_transactions
  FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE owner_id = auth.uid()
    )
  );

-- Community admins can see their community wallet transactions
CREATE POLICY "Community admins can view community transactions" ON wallet_transactions
  FOR SELECT
  USING (
    wallet_id IN (
      SELECT w.id FROM wallets w
      JOIN communities c ON w.owner_id = c.id
      WHERE w.owner_type = 'community' AND c.admin_id = auth.uid()
    )
  );

-- Super admins can see all transactions
CREATE POLICY "Super admins can view all transactions" ON wallet_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- MODULE SALES TABLE
-- Tracks revenue distribution from marketplace purchases
-- =====================================================

CREATE TABLE IF NOT EXISTS module_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sale details
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE SET NULL,
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
  
  -- Pricing
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
  employee_count INTEGER NOT NULL DEFAULT 50,
  
  -- Revenue split amounts
  platform_fee NUMERIC(10, 2) NOT NULL, -- 30%
  community_share NUMERIC(10, 2) NOT NULL, -- 50% (or 70% if creator donates)
  creator_share NUMERIC(10, 2) NOT NULL, -- 20% (or 0% if donated)
  
  -- Creator donation flag
  creator_donated_to_community BOOLEAN DEFAULT false,
  
  -- Wallet references
  community_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  creator_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  platform_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  
  -- Transaction tracking
  transaction_ids JSONB DEFAULT '[]', -- Array of wallet_transaction IDs
  
  -- Payment details
  payment_method TEXT, -- 'stripe', 'bank_transfer', 'invoice'
  payment_id TEXT, -- Stripe payment intent ID, etc.
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  
  -- Timestamps
  purchased_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  refunded_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_sales_module ON module_sales(module_id);
CREATE INDEX IF NOT EXISTS idx_module_sales_corporate ON module_sales(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_module_sales_status ON module_sales(status);
CREATE INDEX IF NOT EXISTS idx_module_sales_date ON module_sales(purchased_at DESC);

-- RLS Policies
ALTER TABLE module_sales ENABLE ROW LEVEL SECURITY;

-- Corporate admins can see their purchases
CREATE POLICY "Corporate admins can view their sales" ON module_sales
  FOR SELECT
  USING (
    corporate_account_id IN (
      SELECT id FROM corporate_accounts WHERE admin_id = auth.uid()
    )
  );

-- Community admins can see sales of their modules
CREATE POLICY "Community admins can view their module sales" ON module_sales
  FOR SELECT
  USING (
    module_id IN (
      SELECT m.id FROM marketplace_modules m
      JOIN communities c ON m.community_id = c.id
      WHERE c.admin_id = auth.uid()
    )
  );

-- Creators can see sales of modules they created
CREATE POLICY "Creators can view their module sales" ON module_sales
  FOR SELECT
  USING (
    module_id IN (
      SELECT id FROM marketplace_modules WHERE created_by = auth.uid()
    )
  );

-- Super admins can see all sales
CREATE POLICY "Super admins can view all sales" ON module_sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- WITHDRAWAL REQUESTS TABLE (Future - Phase 5)
-- Allows communities and creators to withdraw funds
-- =====================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  
  -- Amount
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  
  -- Bank details (encrypted in production)
  bank_name TEXT,
  account_number TEXT,
  account_holder_name TEXT,
  routing_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed')),
  
  -- Admin notes
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_date ON withdrawal_requests(requested_at DESC);

-- RLS Policies
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own withdrawal requests
CREATE POLICY "Users can view their withdrawal requests" ON withdrawal_requests
  FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE owner_id = auth.uid()
    )
  );

-- Users can create withdrawal requests for their wallets
CREATE POLICY "Users can create withdrawal requests" ON withdrawal_requests
  FOR INSERT
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM wallets WHERE owner_id = auth.uid()
    )
  );

-- Super admins can see and manage all withdrawal requests
CREATE POLICY "Super admins can view all withdrawals" ON withdrawal_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get or create wallet for an owner
CREATE OR REPLACE FUNCTION get_or_create_wallet(
  p_owner_type TEXT,
  p_owner_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to find existing wallet
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE owner_type = p_owner_type
    AND (owner_id = p_owner_id OR (owner_id IS NULL AND p_owner_id IS NULL));
  
  -- If not found, create new wallet
  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (owner_type, owner_id, balance)
    VALUES (p_owner_type, p_owner_id, 0.00)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process module sale and split revenue
CREATE OR REPLACE FUNCTION process_module_sale(
  p_module_id UUID,
  p_corporate_account_id UUID,
  p_total_amount NUMERIC,
  p_creator_donates BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_module RECORD;
  v_community_wallet_id UUID;
  v_creator_wallet_id UUID;
  v_platform_wallet_id UUID;
  v_platform_fee NUMERIC;
  v_community_share NUMERIC;
  v_creator_share NUMERIC;
  v_transaction_ids JSONB := '[]';
  v_trans_id UUID;
BEGIN
  -- Get module details
  SELECT * INTO v_module FROM marketplace_modules WHERE id = p_module_id;
  
  -- Calculate splits
  v_platform_fee := p_total_amount * 0.30; -- 30%
  
  IF p_creator_donates THEN
    v_community_share := p_total_amount * 0.70; -- 50% + 20% donation
    v_creator_share := 0.00;
  ELSE
    v_community_share := p_total_amount * 0.50; -- 50%
    v_creator_share := p_total_amount * 0.20; -- 20%
  END IF;
  
  -- Get or create wallets
  v_community_wallet_id := get_or_create_wallet('community', v_module.community_id);
  v_creator_wallet_id := get_or_create_wallet('user', v_module.created_by);
  v_platform_wallet_id := get_or_create_wallet('platform', NULL);
  
  -- Create sale record
  INSERT INTO module_sales (
    module_id,
    corporate_account_id,
    total_amount,
    platform_fee,
    community_share,
    creator_share,
    creator_donated_to_community,
    community_wallet_id,
    creator_wallet_id,
    platform_wallet_id,
    status
  ) VALUES (
    p_module_id,
    p_corporate_account_id,
    p_total_amount,
    v_platform_fee,
    v_community_share,
    v_creator_share,
    p_creator_donates,
    v_community_wallet_id,
    v_creator_wallet_id,
    v_platform_wallet_id,
    'completed'
  ) RETURNING id INTO v_sale_id;
  
  -- Credit community wallet
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, source, source_id,
    description, status
  ) VALUES (
    v_community_wallet_id, 'credit', v_community_share, 'module_sale', v_sale_id,
    'Revenue from module: ' || v_module.title, 'completed'
  ) RETURNING id INTO v_trans_id;
  v_transaction_ids := v_transaction_ids || jsonb_build_array(v_trans_id);
  
  -- Update community wallet balance
  UPDATE wallets SET balance = balance + v_community_share WHERE id = v_community_wallet_id;
  
  -- Credit creator wallet (if not donated)
  IF v_creator_share > 0 THEN
    INSERT INTO wallet_transactions (
      wallet_id, type, amount, source, source_id,
      description, status
    ) VALUES (
      v_creator_wallet_id, 'credit', v_creator_share, 'module_sale', v_sale_id,
      'Creator revenue from module: ' || v_module.title, 'completed'
    ) RETURNING id INTO v_trans_id;
    v_transaction_ids := v_transaction_ids || jsonb_build_array(v_trans_id);
    
    -- Update creator wallet balance
    UPDATE wallets SET balance = balance + v_creator_share WHERE id = v_creator_wallet_id;
  END IF;
  
  -- Credit platform wallet
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, source, source_id,
    description, status
  ) VALUES (
    v_platform_wallet_id, 'credit', v_platform_fee, 'module_sale', v_sale_id,
    'Platform fee from module: ' || v_module.title, 'completed'
  ) RETURNING id INTO v_trans_id;
  v_transaction_ids := v_transaction_ids || jsonb_build_array(v_trans_id);
  
  -- Update platform wallet balance
  UPDATE wallets SET balance = balance + v_platform_fee WHERE id = v_platform_wallet_id;
  
  -- Update sale record with transaction IDs
  UPDATE module_sales SET transaction_ids = v_transaction_ids WHERE id = v_sale_id;
  
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create platform treasury wallet
INSERT INTO wallets (owner_type, owner_id, balance, currency)
VALUES ('platform', NULL, 0.00, 'MXN')
ON CONFLICT (owner_type, owner_id) DO NOTHING;

-- =====================================================
-- SUCCESS!
-- =====================================================

SELECT 'Wallet system tables created successfully!' AS status;

