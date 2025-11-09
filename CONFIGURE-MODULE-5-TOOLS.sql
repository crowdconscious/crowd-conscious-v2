-- ================================================================
-- CONFIGURE MODULE 5 (Comercio Justo) TOOLS
-- ================================================================
-- This script assigns the 5 Fair Trade tools to Module 5 lessons
-- Run this in Supabase SQL Editor after building the tools
-- ================================================================

-- Module 5 ID (Comercio Justo)
DO $$
DECLARE
  module_5_id UUID;
BEGIN
  -- Get Module 5 ID
  SELECT id INTO module_5_id
  FROM marketplace_modules
  WHERE core_value = 'fair_trade'
    AND is_published = true
  LIMIT 1;

  IF module_5_id IS NULL THEN
    RAISE NOTICE '❌ Module 5 (Comercio Justo) not found. Make sure it exists and is published.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Module 5: %', module_5_id;

  -- ========================================
  -- LESSON 1: Supply Chain Mapper
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['supply-chain-mapper']::TEXT[]
  WHERE module_id = module_5_id
    AND lesson_order = 1;

  RAISE NOTICE '✓ Lesson 1: Supply Chain Mapper configured';

  -- ========================================
  -- LESSON 2: Fair Wage Calculator
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['fair-wage-calculator']::TEXT[]
  WHERE module_id = module_5_id
    AND lesson_order = 2;

  RAISE NOTICE '✓ Lesson 2: Fair Wage Calculator configured';

  -- ========================================
  -- LESSON 3: Local Supplier Finder + Procurement Scorecard
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['local-supplier-finder', 'responsible-procurement-scorecard']::TEXT[]
  WHERE module_id = module_5_id
    AND lesson_order = 3;

  RAISE NOTICE '✓ Lesson 3: Local Supplier Finder + Procurement Scorecard configured';

  -- ========================================
  -- LESSON 4: Responsible Procurement Scorecard
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['responsible-procurement-scorecard']::TEXT[]
  WHERE module_id = module_5_id
    AND lesson_order = 4;

  RAISE NOTICE '✓ Lesson 4: Responsible Procurement Scorecard configured';

  -- ========================================
  -- LESSON 5: Impact Report Generator
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['impact-report-generator']::TEXT[]
  WHERE module_id = module_5_id
    AND lesson_order = 5;

  RAISE NOTICE '✓ Lesson 5: Impact Report Generator configured';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MODULE 5 TOOLS CONFIGURED!';
  RAISE NOTICE '🤝 Fair Trade: 5 Tools Active';
  RAISE NOTICE '   1. Supply Chain Mapper';
  RAISE NOTICE '   2. Fair Wage Calculator';
  RAISE NOTICE '   3. Local Supplier Finder';
  RAISE NOTICE '   4. Responsible Procurement Scorecard';
  RAISE NOTICE '   5. Impact Report Generator';
  RAISE NOTICE '============================================';
END $$;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Run this to verify tools are configured:
/*
SELECT 
  ml.lesson_order,
  ml.title,
  ml.tools_used
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'fair_trade'
  AND mm.is_published = true
ORDER BY ml.lesson_order;
*/

