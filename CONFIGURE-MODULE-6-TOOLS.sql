-- ================================================================
-- CONFIGURE MODULE 6 (Integración de Impacto) TOOLS
-- ================================================================
-- This script assigns the 5 Impact Integration tools to Module 6 lessons
-- Run this in Supabase SQL Editor after building the tools
-- ================================================================

-- Module 6 ID (Integración de Impacto)
DO $$
DECLARE
  module_6_id UUID;
BEGIN
  -- Get Module 6 ID
  SELECT id INTO module_6_id
  FROM marketplace_modules
  WHERE core_value = 'impact_integration'
    AND is_published = true
  LIMIT 1;

  IF module_6_id IS NULL THEN
    RAISE NOTICE '❌ Module 6 (Integración de Impacto) not found. Make sure it exists and is published.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found Module 6: %', module_6_id;

  -- ========================================
  -- LESSON 1: Impact Dashboard Builder
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['impact-dashboard-builder']::TEXT[]
  WHERE module_id = module_6_id
    AND lesson_order = 1;

  RAISE NOTICE '✓ Lesson 1: Impact Dashboard Builder configured';

  -- ========================================
  -- LESSON 2: ESG Report Generator
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['esg-report-generator']::TEXT[]
  WHERE module_id = module_6_id
    AND lesson_order = 2;

  RAISE NOTICE '✓ Lesson 2: ESG Report Generator configured';

  -- ========================================
  -- LESSON 3: Stakeholder Communication Planner
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['stakeholder-communication-planner']::TEXT[]
  WHERE module_id = module_6_id
    AND lesson_order = 3;

  RAISE NOTICE '✓ Lesson 3: Stakeholder Communication Planner configured';

  -- ========================================
  -- LESSON 4: Certification Hub
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['certification-hub']::TEXT[]
  WHERE module_id = module_6_id
    AND lesson_order = 4;

  RAISE NOTICE '✓ Lesson 4: Certification Hub configured';

  -- ========================================
  -- LESSON 5: Continuous Improvement Tracker
  -- ========================================
  UPDATE module_lessons
  SET tools_used = ARRAY['continuous-improvement-tracker']::TEXT[]
  WHERE module_id = module_6_id
    AND lesson_order = 5;

  RAISE NOTICE '✓ Lesson 5: Continuous Improvement Tracker configured';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MODULE 6 TOOLS CONFIGURED!';
  RAISE NOTICE '📊 Impact Integration: 5 Tools Active';
  RAISE NOTICE '   1. Impact Dashboard Builder';
  RAISE NOTICE '   2. ESG Report Generator';
  RAISE NOTICE '   3. Stakeholder Communication Planner';
  RAISE NOTICE '   4. Certification Hub';
  RAISE NOTICE '   5. Continuous Improvement Tracker';
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
WHERE mm.core_value = 'impact_integration'
  AND mm.is_published = true
ORDER BY ml.lesson_order;
*/

