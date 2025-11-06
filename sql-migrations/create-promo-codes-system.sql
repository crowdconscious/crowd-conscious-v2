-- =====================================================
-- PROMO CODES & REFERRAL SYSTEM
-- =====================================================
-- Purpose: Allow admins to create discount codes for strategic partners,
--          promotions, and referral programs
-- =====================================================

-- STEP 1: Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code Details
  code TEXT UNIQUE NOT NULL, -- e.g., "PARTNER50", "LAUNCH100"
  description TEXT, -- Internal note about the code
  
  -- Discount Type & Amount
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free')),
  discount_value NUMERIC(10, 2) NOT NULL, -- e.g., 50 (for 50% off) or 5000 (for $5000 MXN off)
  
  -- Usage Limits
  max_uses INTEGER, -- NULL = unlimited uses
  max_uses_per_user INTEGER DEFAULT 1, -- How many times one user can use it
  current_uses INTEGER DEFAULT 0, -- Track total uses
  
  -- Date Restrictions
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP, -- NULL = no expiration
  
  -- Module Restrictions (optional)
  applicable_modules UUID[], -- NULL = all modules, or specific module IDs
  
  -- Purchase Type Restrictions
  applicable_purchase_types TEXT[], -- NULL = all types, or ['individual', 'team', 'corporate']
  
  -- Minimum Purchase
  minimum_purchase_amount NUMERIC(10, 2) DEFAULT 0, -- Minimum cart value to apply code
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Creator & Tracking
  created_by UUID REFERENCES auth.users(id), -- Which admin created it
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Partner/Campaign Tracking
  partner_name TEXT, -- e.g., "EcoTech Solutions"
  campaign_name TEXT, -- e.g., "Launch Week 2025"
  notes TEXT -- Admin notes
);

-- STEP 2: Create promo_code_uses table (track usage)
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- What was purchased
  cart_total_before_discount NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  cart_total_after_discount NUMERIC(10, 2) NOT NULL,
  
  -- Module details
  modules_purchased JSONB, -- Array of {module_id, title, original_price, discounted_price}
  
  -- Metadata
  used_at TIMESTAMP DEFAULT NOW(),
  stripe_session_id TEXT, -- Link to payment
  
  -- Track IP for fraud prevention
  user_ip TEXT,
  user_agent TEXT
);

-- STEP 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_dates ON promo_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_code ON promo_code_uses(promo_code_id);

-- STEP 4: Add promo_code_id to cart_items (track applied codes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'promo_code_id'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
    ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN final_price NUMERIC(10, 2); -- Price after discount
    
    RAISE NOTICE '✅ Added promo code columns to cart_items';
  END IF;
END $$;

-- STEP 5: Create function to validate promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_cart_total NUMERIC,
  p_purchase_type TEXT DEFAULT 'individual'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_promo_code promo_codes;
  v_user_uses INTEGER;
  v_discount_amount NUMERIC;
  v_final_total NUMERIC;
  v_is_valid BOOLEAN := TRUE;
  v_error_message TEXT := NULL;
BEGIN
  -- Fetch promo code
  SELECT * INTO v_promo_code
  FROM promo_codes
  WHERE code = UPPER(p_code)
  AND active = TRUE;

  -- Check if code exists
  IF v_promo_code IS NULL THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Código promocional no válido o inactivo'
    );
  END IF;

  -- Check if code has started
  IF v_promo_code.valid_from > NOW() THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Este código aún no está activo'
    );
  END IF;

  -- Check if code has expired
  IF v_promo_code.valid_until IS NOT NULL AND v_promo_code.valid_until < NOW() THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Este código ha expirado'
    );
  END IF;

  -- Check max uses
  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.current_uses >= v_promo_code.max_uses THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Este código ha alcanzado su límite de usos'
    );
  END IF;

  -- Check user usage limit
  SELECT COUNT(*) INTO v_user_uses
  FROM promo_code_uses
  WHERE promo_code_id = v_promo_code.id
  AND user_id = p_user_id;

  IF v_promo_code.max_uses_per_user IS NOT NULL AND v_user_uses >= v_promo_code.max_uses_per_user THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Ya has utilizado este código el máximo de veces permitido'
    );
  END IF;

  -- Check minimum purchase
  IF p_cart_total < v_promo_code.minimum_purchase_amount THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', format('Compra mínima de $%s MXN requerida', v_promo_code.minimum_purchase_amount)
    );
  END IF;

  -- Check purchase type restriction
  IF v_promo_code.applicable_purchase_types IS NOT NULL 
     AND NOT (p_purchase_type = ANY(v_promo_code.applicable_purchase_types)) THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'Este código no es aplicable a tu tipo de compra'
    );
  END IF;

  -- Calculate discount
  IF v_promo_code.discount_type = 'percentage' THEN
    v_discount_amount := ROUND((p_cart_total * v_promo_code.discount_value / 100), 2);
  ELSIF v_promo_code.discount_type = 'fixed_amount' THEN
    v_discount_amount := LEAST(v_promo_code.discount_value, p_cart_total);
  ELSIF v_promo_code.discount_type = 'free' THEN
    v_discount_amount := p_cart_total;
  END IF;

  v_final_total := GREATEST(p_cart_total - v_discount_amount, 0);

  -- Return valid response
  RETURN jsonb_build_object(
    'valid', TRUE,
    'promo_code_id', v_promo_code.id,
    'code', v_promo_code.code,
    'discount_type', v_promo_code.discount_type,
    'discount_value', v_promo_code.discount_value,
    'discount_amount', v_discount_amount,
    'original_total', p_cart_total,
    'final_total', v_final_total,
    'description', v_promo_code.description,
    'savings_percentage', ROUND((v_discount_amount / p_cart_total * 100), 0)
  );
END;
$$;

-- STEP 6: Grant permissions
GRANT SELECT ON promo_codes TO authenticated;
GRANT ALL ON promo_code_uses TO authenticated;
GRANT EXECUTE ON FUNCTION validate_promo_code(TEXT, UUID, NUMERIC, TEXT) TO authenticated;

-- STEP 7: Insert sample promo codes for testing
INSERT INTO promo_codes (
  code, description, discount_type, discount_value, 
  max_uses, partner_name, campaign_name, notes
) VALUES
  (
    'LAUNCH100',
    'Launch Week - 100% off for strategic partners',
    'free',
    100,
    50,
    'Strategic Partners',
    'Platform Launch 2025',
    'Full access for early adopters and strategic partners'
  ),
  (
    'PARTNER50',
    '50% off for partner organizations',
    'percentage',
    50,
    NULL, -- Unlimited uses
    'Partner Network',
    'Partner Program',
    'Ongoing 50% discount for verified partners'
  ),
  (
    'WELCOME25',
    'Welcome discount for new users',
    'percentage',
    25,
    NULL,
    NULL,
    'Welcome Campaign',
    'First-time user discount'
  )
ON CONFLICT (code) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🎉 Promo code system created successfully!';
  RAISE NOTICE '📊 Sample codes: LAUNCH100 (free), PARTNER50 (50%% off), WELCOME25 (25%% off)';
END $$;

