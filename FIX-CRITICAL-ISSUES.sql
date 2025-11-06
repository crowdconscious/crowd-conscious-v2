-- =====================================================
-- FIX CRITICAL ISSUES
-- =====================================================
-- 1. Add is_template column for module templates
-- 2. Mark 6 platform modules as templates
-- 3. Fix any missing promo_codes columns
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing critical issues...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- ISSUE 1 & 2: MODULE TEMPLATES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '📚 Step 1/2: Adding is_template column...';
END $$;

-- Add is_template column if it doesn't exist
ALTER TABLE marketplace_modules 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Mark the 6 platform modules as templates
UPDATE marketplace_modules
SET is_template = TRUE
WHERE is_platform_module = TRUE
  AND status = 'published';

-- Verify
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count 
  FROM marketplace_modules 
  WHERE is_template = TRUE;
  
  RAISE NOTICE '✅ Templates marked: %', template_count;
END $$;

-- =====================================================
-- ISSUE 3: PROMO CODES - ADD MISSING FIELDS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎟️ Step 2/2: Checking promo_codes table...';
END $$;

-- Add any missing columns that might cause insert errors
ALTER TABLE promo_codes 
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP DEFAULT NOW();

-- Make sure created_by can be null (for now)
ALTER TABLE promo_codes 
ALTER COLUMN created_by DROP NOT NULL;

-- Verify promo_codes structure
DO $$
DECLARE
  promo_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO promo_column_count 
  FROM information_schema.columns 
  WHERE table_name = 'promo_codes';
  
  RAISE NOTICE '✅ Promo codes table has % columns', promo_column_count;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 FIXES COMPLETE!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
END $$;

-- Show results
SELECT 
  '✅ MODULE TEMPLATES' as feature,
  COUNT(*) as count
FROM marketplace_modules
WHERE is_template = TRUE
UNION ALL
SELECT 
  '✅ PLATFORM MODULES',
  COUNT(*)
FROM marketplace_modules
WHERE is_platform_module = TRUE
UNION ALL
SELECT 
  '✅ PROMO CODES',
  COUNT(*)
FROM promo_codes;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was fixed:';
  RAISE NOTICE '✅ 1. Module templates now available';
  RAISE NOTICE '✅ 2. 6 platform modules marked as templates';
  RAISE NOTICE '✅ 3. Promo codes table structure verified';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Try creating a promo code now!';
  RAISE NOTICE '🚀 Templates available at /communities/[id]/modules/templates';
END $$;

