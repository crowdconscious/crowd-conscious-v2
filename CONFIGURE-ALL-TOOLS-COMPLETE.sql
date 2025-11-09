-- ================================================================
-- 🚀 MASTER CONFIGURATION: ALL MODULE TOOLS (1-6)
-- ================================================================
-- This script configures ALL 29 interactive tools across 6 modules
-- Run this ONE file in Supabase SQL Editor to activate everything
-- ================================================================
-- Modules covered:
--   Module 1: Aire Limpio (5 tools)
--   Module 2: Agua Limpia (5 tools)
--   Module 3: Ciudades Seguras (5 tools)
--   Module 4: Cero Residuos (4 tools)
--   Module 5: Comercio Justo (5 tools) ⭐ NEW
--   Module 6: Integración de Impacto (5 tools) ⭐ NEW
-- TOTAL: 29 Interactive Tools
-- ================================================================

DO $$
DECLARE
  module_1_id UUID;
  module_2_id UUID;
  module_3_id UUID;
  module_4_id UUID;
  module_5_id UUID;
  module_6_id UUID;
  modules_found INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🚀 STARTING TOOL CONFIGURATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- ========================================
  -- STEP 1: Find all module IDs
  -- ========================================
  RAISE NOTICE '📍 STEP 1: Locating modules...';

  SELECT id INTO module_1_id
  FROM marketplace_modules
  WHERE core_value = 'clean_air' AND is_published = true
  ORDER BY created_at DESC LIMIT 1;

  IF module_1_id IS NOT NULL THEN
    modules_found := modules_found + 1;
    RAISE NOTICE '✓ Module 1 (Aire Limpio): %', module_1_id;
  ELSE
    RAISE NOTICE '⚠ Module 1 (Aire Limpio) not found';
  END IF;

  SELECT id INTO module_2_id
  FROM marketplace_modules
  WHERE core_value = 'clean_water' AND is_published = true
  LIMIT 1;

  IF module_2_id IS NOT NULL THEN
    modules_found := modules_found + 1;
    RAISE NOTICE '✓ Module 2 (Agua Limpia): %', module_2_id;
  ELSE
    RAISE NOTICE '⚠ Module 2 (Agua Limpia) not found';
  END IF;

  SELECT id INTO module_3_id
  FROM marketplace_modules
  WHERE core_value = 'safe_cities' AND is_published = true
  LIMIT 1;

  IF module_3_id IS NOT NULL THEN
    modules_found := modules_found + 1;
    RAISE NOTICE '✓ Module 3 (Ciudades Seguras): %', module_3_id;
  ELSE
    RAISE NOTICE '⚠ Module 3 (Ciudades Seguras) not found';
  END IF;

  SELECT id INTO module_4_id
  FROM marketplace_modules
  WHERE core_value = 'zero_waste' AND is_published = true
  LIMIT 1;

  IF module_4_id IS NOT NULL THEN
    modules_found := modules_found + 1;
    RAISE NOTICE '✓ Module 4 (Cero Residuos): %', module_4_id;
  ELSE
    RAISE NOTICE '⚠ Module 4 (Cero Residuos) not found';
  END IF;

  SELECT id INTO module_5_id
  FROM marketplace_modules
  WHERE core_value = 'fair_trade' AND is_published = true
  LIMIT 1;

  IF module_5_id IS NOT NULL THEN
    modules_found := modules_found + 1;
    RAISE NOTICE '✓ Module 5 (Comercio Justo): %', module_5_id;
  ELSE
    RAISE NOTICE '⚠ Module 5 (Comercio Justo) not found';
  END IF;

  SELECT id INTO module_6_id
  FROM marketplace_modules
  WHERE core_value = 'impact_integration' AND is_published = true
  LIMIT 1;

  IF module_6_id IS NOT NULL THEN
    modules_found := modules_found + 1;
    RAISE NOTICE '✓ Module 6 (Integración de Impacto): %', module_6_id;
  ELSE
    RAISE NOTICE '⚠ Module 6 (Integración de Impacto) not found';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Found %/6 modules', modules_found;
  RAISE NOTICE '';

  -- ========================================
  -- MODULE 1: Aire Limpio (5 tools)
  -- ========================================
  IF module_1_id IS NOT NULL THEN
    RAISE NOTICE '🌬️  CONFIGURING MODULE 1: Aire Limpio...';

    UPDATE module_lessons SET tools_used = ARRAY['air-quality-assessment']::TEXT[]
    WHERE module_id = module_1_id AND lesson_order = 1;

    UPDATE module_lessons SET tools_used = ARRAY['emission-source-identifier']::TEXT[]
    WHERE module_id = module_1_id AND lesson_order = 2;

    UPDATE module_lessons SET tools_used = ARRAY['air-quality-roi']::TEXT[]
    WHERE module_id = module_1_id AND lesson_order = 3;

    UPDATE module_lessons SET tools_used = ARRAY['implementation-timeline']::TEXT[]
    WHERE module_id = module_1_id AND lesson_order = 4;

    UPDATE module_lessons SET tools_used = ARRAY['air-quality-monitor']::TEXT[]
    WHERE module_id = module_1_id AND lesson_order = 5;

    RAISE NOTICE '   ✓ 5 tools configured';
  END IF;

  -- ========================================
  -- MODULE 2: Agua Limpia (5 tools)
  -- ========================================
  IF module_2_id IS NOT NULL THEN
    RAISE NOTICE '💧 CONFIGURING MODULE 2: Agua Limpia...';

    UPDATE module_lessons SET tools_used = ARRAY['water-footprint-calculator']::TEXT[]
    WHERE module_id = module_2_id AND lesson_order = 1;

    UPDATE module_lessons SET tools_used = ARRAY['water-audit-tool']::TEXT[]
    WHERE module_id = module_2_id AND lesson_order = 2;

    UPDATE module_lessons SET tools_used = ARRAY['water-conservation-tracker']::TEXT[]
    WHERE module_id = module_2_id AND lesson_order = 3;

    UPDATE module_lessons SET tools_used = ARRAY['water-quality-test-log']::TEXT[]
    WHERE module_id = module_2_id AND lesson_order = 4;

    UPDATE module_lessons SET tools_used = ARRAY['recycling-system-designer']::TEXT[]
    WHERE module_id = module_2_id AND lesson_order = 5;

    RAISE NOTICE '   ✓ 5 tools configured';
  END IF;

  -- ========================================
  -- MODULE 3: Ciudades Seguras (5 tools)
  -- ========================================
  IF module_3_id IS NOT NULL THEN
    RAISE NOTICE '🏙️  CONFIGURING MODULE 3: Ciudades Seguras...';

    UPDATE module_lessons SET tools_used = ARRAY['security-audit-tool']::TEXT[]
    WHERE module_id = module_3_id AND lesson_order = 1;

    UPDATE module_lessons SET tools_used = ARRAY['community-survey-tool']::TEXT[]
    WHERE module_id = module_3_id AND lesson_order = 2;

    UPDATE module_lessons SET tools_used = ARRAY['security-audit-tool']::TEXT[]
    WHERE module_id = module_3_id AND lesson_order = 3;

    UPDATE module_lessons SET tools_used = ARRAY['community-survey-tool']::TEXT[]
    WHERE module_id = module_3_id AND lesson_order = 4;

    UPDATE module_lessons SET tools_used = ARRAY['cost-calculator']::TEXT[]
    WHERE module_id = module_3_id AND lesson_order = 5;

    RAISE NOTICE '   ✓ 5 tools configured';
  END IF;

  -- ========================================
  -- MODULE 4: Cero Residuos (4 tools)
  -- ========================================
  IF module_4_id IS NOT NULL THEN
    RAISE NOTICE '♻️  CONFIGURING MODULE 4: Cero Residuos...';

    UPDATE module_lessons SET tools_used = ARRAY['waste-stream-analyzer']::TEXT[]
    WHERE module_id = module_4_id AND lesson_order = 1;

    UPDATE module_lessons SET tools_used = ARRAY['waste-stream-analyzer']::TEXT[]
    WHERE module_id = module_4_id AND lesson_order = 2;

    UPDATE module_lessons SET tools_used = ARRAY['five-rs-checklist']::TEXT[]
    WHERE module_id = module_4_id AND lesson_order = 3;

    UPDATE module_lessons SET tools_used = ARRAY['composting-calculator']::TEXT[]
    WHERE module_id = module_4_id AND lesson_order = 4;

    UPDATE module_lessons SET tools_used = ARRAY['composting-calculator', 'zero-waste-certification-roadmap']::TEXT[]
    WHERE module_id = module_4_id AND lesson_order = 5;

    RAISE NOTICE '   ✓ 4 tools configured';
  END IF;

  -- ========================================
  -- MODULE 5: Comercio Justo (5 tools) ⭐ NEW
  -- ========================================
  IF module_5_id IS NOT NULL THEN
    RAISE NOTICE '🤝 CONFIGURING MODULE 5: Comercio Justo...';

    UPDATE module_lessons SET tools_used = ARRAY['supply-chain-mapper']::TEXT[]
    WHERE module_id = module_5_id AND lesson_order = 1;

    UPDATE module_lessons SET tools_used = ARRAY['fair-wage-calculator']::TEXT[]
    WHERE module_id = module_5_id AND lesson_order = 2;

    UPDATE module_lessons SET tools_used = ARRAY['local-supplier-finder', 'responsible-procurement-scorecard']::TEXT[]
    WHERE module_id = module_5_id AND lesson_order = 3;

    UPDATE module_lessons SET tools_used = ARRAY['responsible-procurement-scorecard']::TEXT[]
    WHERE module_id = module_5_id AND lesson_order = 4;

    UPDATE module_lessons SET tools_used = ARRAY['impact-report-generator']::TEXT[]
    WHERE module_id = module_5_id AND lesson_order = 5;

    RAISE NOTICE '   ✓ 5 tools configured';
  END IF;

  -- ========================================
  -- MODULE 6: Integración de Impacto (5 tools) ⭐ NEW
  -- ========================================
  IF module_6_id IS NOT NULL THEN
    RAISE NOTICE '📊 CONFIGURING MODULE 6: Integración de Impacto...';

    UPDATE module_lessons SET tools_used = ARRAY['impact-dashboard-builder']::TEXT[]
    WHERE module_id = module_6_id AND lesson_order = 1;

    UPDATE module_lessons SET tools_used = ARRAY['esg-report-generator']::TEXT[]
    WHERE module_id = module_6_id AND lesson_order = 2;

    UPDATE module_lessons SET tools_used = ARRAY['stakeholder-communication-planner']::TEXT[]
    WHERE module_id = module_6_id AND lesson_order = 3;

    UPDATE module_lessons SET tools_used = ARRAY['certification-hub']::TEXT[]
    WHERE module_id = module_6_id AND lesson_order = 4;

    UPDATE module_lessons SET tools_used = ARRAY['continuous-improvement-tracker']::TEXT[]
    WHERE module_id = module_6_id AND lesson_order = 5;

    RAISE NOTICE '   ✓ 5 tools configured';
  END IF;

  -- ========================================
  -- FINAL SUMMARY
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ALL MODULE TOOLS CONFIGURED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 TOOL SUMMARY:';
  IF module_1_id IS NOT NULL THEN
    RAISE NOTICE '   🌬️  Module 1: Aire Limpio - 5 Tools';
  END IF;
  IF module_2_id IS NOT NULL THEN
    RAISE NOTICE '   💧 Module 2: Agua Limpia - 5 Tools';
  END IF;
  IF module_3_id IS NOT NULL THEN
    RAISE NOTICE '   🏙️  Module 3: Ciudades Seguras - 5 Tools';
  END IF;
  IF module_4_id IS NOT NULL THEN
    RAISE NOTICE '   ♻️  Module 4: Cero Residuos - 4 Tools';
  END IF;
  IF module_5_id IS NOT NULL THEN
    RAISE NOTICE '   🤝 Module 5: Comercio Justo - 5 Tools ⭐ NEW';
  END IF;
  IF module_6_id IS NOT NULL THEN
    RAISE NOTICE '   📊 Module 6: Integración de Impacto - 5 Tools ⭐ NEW';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '📊 TOTAL: 29 Interactive Tools Active';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Refresh your lesson pages in browser';
  RAISE NOTICE '   2. Tools will appear in "Herramientas Interactivas" section';
  RAISE NOTICE '   3. Test each tool and verify data is saving';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Platform is now COMPLETE with all 6 modules!';
  RAISE NOTICE '============================================';
END $$;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Run this after configuration to verify all tools:
/*
SELECT 
  mm.core_value,
  mm.title as module,
  ml.lesson_order,
  ml.title as lesson,
  ml.tools_used,
  array_length(ml.tools_used, 1) as tool_count
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.is_published = true
  AND mm.core_value IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'impact_integration')
ORDER BY mm.core_value, ml.lesson_order;
*/

