-- ============================================================================
-- PHASE 3: COMMUNITY-SET PRICING MIGRATION
-- ============================================================================
-- Purpose: Allow communities to set their own module prices
-- Status: Ready to run AFTER Phase 1 & 2
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add pricing control fields
-- ============================================================================

-- Flag to indicate if community set the price (vs platform default)
ALTER TABLE marketplace_modules
ADD COLUMN IF NOT EXISTS price_set_by_community BOOLEAN DEFAULT true;

COMMENT ON COLUMN marketplace_modules.price_set_by_community IS
'TRUE if community set custom price, FALSE if using platform default (platform modules always FALSE)';

-- Platform's suggested price for guidance
ALTER TABLE marketplace_modules
ADD COLUMN IF NOT EXISTS platform_suggested_price INTEGER;

COMMENT ON COLUMN marketplace_modules.platform_suggested_price IS
'Platform-recommended price for this module type (guidance for communities)';

-- Notes/reasoning for pricing decision
ALTER TABLE marketplace_modules
ADD COLUMN IF NOT EXISTS pricing_notes TEXT;

COMMENT ON COLUMN marketplace_modules.pricing_notes IS
'Community notes about their pricing strategy (internal use)';

-- ============================================================================
-- STEP 2: Add individual pricing field
-- ============================================================================
-- Price for individual purchases (1 person)

ALTER TABLE marketplace_modules
ADD COLUMN IF NOT EXISTS individual_price_mxn INTEGER;

COMMENT ON COLUMN marketplace_modules.individual_price_mxn IS
'Price for individual purchase (1 person). If NULL, calculated as base_price_mxn / 50';

-- ============================================================================
-- STEP 3: Add pricing tier fields (for future flexibility)
-- ============================================================================

-- Small team pricing (5-20 people)
ALTER TABLE marketplace_modules
ADD COLUMN IF NOT EXISTS team_price_mxn INTEGER;

COMMENT ON COLUMN marketplace_modules.team_price_mxn IS
'Price for small team purchase (5-20 people). If NULL, calculated dynamically';

-- Team discount percentage
ALTER TABLE marketplace_modules
ADD COLUMN IF NOT EXISTS team_discount_percent INTEGER DEFAULT 10 CHECK (team_discount_percent >= 0 AND team_discount_percent <= 100);

COMMENT ON COLUMN marketplace_modules.team_discount_percent IS
'Discount percentage for team purchases (default 10%)';

-- ============================================================================
-- STEP 4: Update platform modules with fixed pricing
-- ============================================================================

UPDATE marketplace_modules
SET 
  price_set_by_community = false,
  base_price_mxn = 18000,
  price_per_50_employees = 8000,
  individual_price_mxn = 360, -- 18000 / 50
  platform_suggested_price = 18000,
  pricing_notes = 'Platform module - fixed pricing with premium tools'
WHERE is_platform_module = true;

-- ============================================================================
-- STEP 5: Set suggested prices for community modules
-- ============================================================================

UPDATE marketplace_modules
SET 
  platform_suggested_price = COALESCE(platform_suggested_price, 18000),
  individual_price_mxn = COALESCE(individual_price_mxn, base_price_mxn / 50)
WHERE is_platform_module = false;

-- ============================================================================
-- STEP 6: Create pricing calculation function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_module_price(
  p_module_id UUID,
  p_user_count INTEGER,
  p_purchase_type TEXT DEFAULT 'corporate'
)
RETURNS INTEGER AS $$
DECLARE
  v_module RECORD;
  v_price INTEGER;
  v_packs INTEGER;
BEGIN
  -- Get module pricing info
  SELECT 
    base_price_mxn,
    price_per_50_employees,
    individual_price_mxn,
    team_price_mxn,
    team_discount_percent,
    is_platform_module
  INTO v_module
  FROM marketplace_modules
  WHERE id = p_module_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Module not found: %', p_module_id;
  END IF;

  -- Calculate based on user count and type
  IF p_user_count = 1 THEN
    -- Individual purchase
    v_price := COALESCE(v_module.individual_price_mxn, v_module.base_price_mxn / 50);
    
  ELSIF p_user_count <= 20 AND p_purchase_type = 'team' THEN
    -- Small team purchase (with discount)
    IF v_module.team_price_mxn IS NOT NULL THEN
      v_price := v_module.team_price_mxn;
    ELSE
      v_price := (v_module.base_price_mxn / 50 * p_user_count) * (100 - v_module.team_discount_percent) / 100;
    END IF;
    
  ELSE
    -- Corporate purchase (pack-based)
    v_packs := CEIL(p_user_count::NUMERIC / 50);
    v_price := v_module.base_price_mxn + ((v_packs - 1) * v_module.price_per_50_employees);
  END IF;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION calculate_module_price IS
'Calculates module price based on user count and purchase type. Returns price in MXN.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_module_price TO authenticated;

-- ============================================================================
-- STEP 7: Create pricing preview function (for module builder)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pricing_preview(
  p_base_price INTEGER,
  p_price_per_pack INTEGER,
  p_individual_price INTEGER DEFAULT NULL,
  p_team_discount INTEGER DEFAULT 10
)
RETURNS TABLE(
  user_count INTEGER,
  total_price INTEGER,
  price_per_person INTEGER,
  purchase_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Individual (1 person)
  SELECT 
    1::INTEGER,
    COALESCE(p_individual_price, p_base_price / 50)::INTEGER,
    COALESCE(p_individual_price, p_base_price / 50)::INTEGER,
    'individual'::TEXT
  
  UNION ALL
  
  -- Small team (10 people)
  SELECT 
    10::INTEGER,
    ((p_base_price / 50 * 10) * (100 - p_team_discount) / 100)::INTEGER,
    ((p_base_price / 50) * (100 - p_team_discount) / 100)::INTEGER,
    'team'::TEXT
  
  UNION ALL
  
  -- Medium team (25 people)
  SELECT 
    25::INTEGER,
    ((p_base_price / 50 * 25) * (100 - p_team_discount) / 100)::INTEGER,
    ((p_base_price / 50) * (100 - p_team_discount) / 100)::INTEGER,
    'team'::TEXT
  
  UNION ALL
  
  -- Corporate (50 people)
  SELECT 
    50::INTEGER,
    p_base_price::INTEGER,
    (p_base_price / 50)::INTEGER,
    'corporate'::TEXT
  
  UNION ALL
  
  -- Corporate (100 people)
  SELECT 
    100::INTEGER,
    (p_base_price + p_price_per_pack)::INTEGER,
    ((p_base_price + p_price_per_pack) / 100)::INTEGER,
    'corporate'::TEXT
  
  UNION ALL
  
  -- Enterprise (200 people)
  SELECT 
    200::INTEGER,
    (p_base_price + (3 * p_price_per_pack))::INTEGER,
    ((p_base_price + (3 * p_price_per_pack)) / 200)::INTEGER,
    'enterprise'::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_pricing_preview IS
'Returns pricing preview for different user counts (used in module builder)';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_pricing_preview TO authenticated;

-- ============================================================================
-- STEP 8: Create view for marketplace with pricing
-- ============================================================================

CREATE OR REPLACE VIEW marketplace_modules_with_pricing AS
SELECT 
  m.*,
  -- Calculate prices for common scenarios
  COALESCE(m.individual_price_mxn, m.base_price_mxn / 50) AS individual_price,
  m.base_price_mxn AS corporate_50_price,
  (m.base_price_mxn + m.price_per_50_employees) AS corporate_100_price,
  -- Revenue split info
  CASE 
    WHEN m.is_platform_module THEN 'Platform: 100%'
    ELSE 'Community: 50% | Creator: 20% | Platform: 30%'
  END AS revenue_split,
  -- Pricing flexibility
  CASE 
    WHEN m.is_platform_module THEN 'Fixed by platform'
    WHEN m.price_set_by_community THEN 'Set by community'
    ELSE 'Platform default'
  END AS pricing_control
FROM marketplace_modules m
WHERE m.status = 'published';

COMMENT ON VIEW marketplace_modules_with_pricing IS
'Marketplace modules with calculated pricing for different scenarios';

-- Grant access to anonymous and authenticated users
GRANT SELECT ON marketplace_modules_with_pricing TO anon, authenticated;

-- ============================================================================
-- STEP 9: Add pricing validation trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_module_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate base price
  IF NEW.base_price_mxn < 300 THEN
    RAISE EXCEPTION 'Base price must be at least 300 MXN (minimum viable price)';
  END IF;

  -- Validate individual price if set
  IF NEW.individual_price_mxn IS NOT NULL AND NEW.individual_price_mxn < 10 THEN
    RAISE EXCEPTION 'Individual price must be at least 10 MXN';
  END IF;

  -- Platform modules must have fixed pricing
  IF NEW.is_platform_module = true THEN
    NEW.price_set_by_community := false;
    NEW.base_price_mxn := 18000;
    NEW.individual_price_mxn := 360;
  END IF;

  -- Auto-calculate individual price if not set
  IF NEW.individual_price_mxn IS NULL THEN
    NEW.individual_price_mxn := NEW.base_price_mxn / 50;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_pricing_trigger ON marketplace_modules;
CREATE TRIGGER validate_pricing_trigger
  BEFORE INSERT OR UPDATE ON marketplace_modules
  FOR EACH ROW
  EXECUTE FUNCTION validate_module_pricing();

COMMENT ON FUNCTION validate_module_pricing IS
'Validates and auto-calculates module pricing before insert/update';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  platform_count INTEGER;
  community_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Marketplace modules table updated successfully';
  RAISE NOTICE 'New columns: price_set_by_community, platform_suggested_price, pricing_notes, individual_price_mxn, team_price_mxn, team_discount_percent';
  RAISE NOTICE 'Functions: calculate_module_price, get_pricing_preview';
  RAISE NOTICE 'Views: marketplace_modules_with_pricing';
  RAISE NOTICE 'Triggers: validate_pricing_trigger';
  
  -- Count modules by type
  SELECT COUNT(*) INTO platform_count FROM marketplace_modules WHERE is_platform_module = true;
  SELECT COUNT(*) INTO community_count FROM marketplace_modules WHERE is_platform_module = false;
  
  RAISE NOTICE 'Platform modules: % (fixed pricing)', platform_count;
  RAISE NOTICE 'Community modules: % (flexible pricing)', community_count;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION TESTS (Optional - run separately)
-- ============================================================================

/*
-- Test 1: Calculate individual price
SELECT calculate_module_price('module-id', 1, 'individual');
-- Expected: Returns individual price (e.g., 360 MXN)

-- Test 2: Calculate team price
SELECT calculate_module_price('module-id', 10, 'team');
-- Expected: Returns discounted team price

-- Test 3: Calculate corporate price
SELECT calculate_module_price('module-id', 75, 'corporate');
-- Expected: Returns pack-based price (2 packs)

-- Test 4: Get pricing preview
SELECT * FROM get_pricing_preview(18000, 8000, 360, 10);
-- Expected: Returns pricing table for 1, 10, 25, 50, 100, 200 users

-- Test 5: View marketplace with pricing
SELECT title, individual_price, corporate_50_price, pricing_control 
FROM marketplace_modules_with_pricing 
LIMIT 5;
-- Expected: Shows modules with calculated prices
*/

