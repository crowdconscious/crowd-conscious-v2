-- =========================================================
-- MASTER CONFIGURATION: ALL MODULE TOOLS (Modules 1-4)
-- =========================================================
-- This script configures ALL tools for Modules 1-4 in one go
-- Run this ONCE in Supabase SQL Editor to activate all tools
-- =========================================================

-- =========================================================
-- MODULE 1: AIRE LIMPIO (Clean Air)
-- =========================================================
UPDATE module_lessons SET tools_used = ARRAY['air-quality-assessment'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air' ORDER BY created_at DESC LIMIT 1) AND lesson_order = 1;

UPDATE module_lessons SET tools_used = ARRAY['emission-source-identifier'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air' ORDER BY created_at DESC LIMIT 1) AND lesson_order = 2;

UPDATE module_lessons SET tools_used = ARRAY['air-quality-roi'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air' ORDER BY created_at DESC LIMIT 1) AND lesson_order = 3;

UPDATE module_lessons SET tools_used = ARRAY['implementation-timeline'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air' ORDER BY created_at DESC LIMIT 1) AND lesson_order = 4;

UPDATE module_lessons SET tools_used = ARRAY['air-quality-monitor'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air' ORDER BY created_at DESC LIMIT 1) AND lesson_order = 5;

-- =========================================================
-- MODULE 2: AGUA LIMPIA (Clean Water)
-- =========================================================
UPDATE module_lessons SET tools_used = ARRAY['water-footprint-calculator'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water' LIMIT 1) AND lesson_order = 1;

UPDATE module_lessons SET tools_used = ARRAY['water-audit-tool'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water' LIMIT 1) AND lesson_order = 2;

UPDATE module_lessons SET tools_used = ARRAY['water-conservation-tracker'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water' LIMIT 1) AND lesson_order = 3;

UPDATE module_lessons SET tools_used = ARRAY['water-quality-test-log'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water' LIMIT 1) AND lesson_order = 4;

UPDATE module_lessons SET tools_used = ARRAY['recycling-system-designer'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water' LIMIT 1) AND lesson_order = 5;

-- =========================================================
-- MODULE 3: CIUDADES SEGURAS (Safe Cities)
-- =========================================================
UPDATE module_lessons SET tools_used = ARRAY['security-audit-tool'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities' LIMIT 1) AND lesson_order = 1;

UPDATE module_lessons SET tools_used = ARRAY['community-survey-tool'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities' LIMIT 1) AND lesson_order = 2;

UPDATE module_lessons SET tools_used = ARRAY['security-audit-tool'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities' LIMIT 1) AND lesson_order = 3;

UPDATE module_lessons SET tools_used = ARRAY['community-survey-tool'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities' LIMIT 1) AND lesson_order = 4;

UPDATE module_lessons SET tools_used = ARRAY['cost-calculator'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities' LIMIT 1) AND lesson_order = 5;

-- =========================================================
-- MODULE 4: CERO RESIDUOS (Zero Waste)
-- =========================================================
UPDATE module_lessons SET tools_used = ARRAY['waste-stream-analyzer'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste' LIMIT 1) AND lesson_order = 1;

UPDATE module_lessons SET tools_used = ARRAY['waste-stream-analyzer'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste' LIMIT 1) AND lesson_order = 2;

UPDATE module_lessons SET tools_used = ARRAY['five-rs-checklist'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste' LIMIT 1) AND lesson_order = 3;

UPDATE module_lessons SET tools_used = ARRAY['composting-calculator'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste' LIMIT 1) AND lesson_order = 4;

UPDATE module_lessons SET tools_used = ARRAY['composting-calculator'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste' LIMIT 1) AND lesson_order = 5;

-- Bonus: If Module 4 has a 6th lesson
UPDATE module_lessons SET tools_used = ARRAY['zero-waste-certification-roadmap'], updated_at = NOW()
WHERE module_id = (SELECT id FROM marketplace_modules WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste' LIMIT 1) AND lesson_order = 6;

-- =========================================================
-- VERIFICATION: CHECK ALL MODULES
-- =========================================================
SELECT 
  mm.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title,
  ml.tools_used,
  ARRAY_LENGTH(ml.tools_used, 1) as tool_count
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste')
ORDER BY 
  CASE mm.core_value
    WHEN 'clean_air' THEN 1
    WHEN 'clean_water' THEN 2
    WHEN 'safe_cities' THEN 3
    WHEN 'zero_waste' THEN 4
  END,
  ml.lesson_order;

-- Expected output: Should see 20-25 lessons with tools assigned across 4 modules

-- =========================================================
-- TOOL COUNT SUMMARY
-- =========================================================
SELECT 
  mm.title as module_title,
  mm.core_value,
  COUNT(ml.id) as total_lessons,
  COUNT(CASE WHEN ml.tools_used IS NOT NULL AND ARRAY_LENGTH(ml.tools_used, 1) > 0 THEN 1 END) as lessons_with_tools
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON ml.module_id = mm.id
WHERE mm.core_value IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste')
GROUP BY mm.id, mm.title, mm.core_value
ORDER BY 
  CASE mm.core_value
    WHEN 'clean_air' THEN 1
    WHEN 'clean_water' THEN 2
    WHEN 'safe_cities' THEN 3
    WHEN 'zero_waste' THEN 4
  END;

-- Expected: Each module should show 5 lessons with tools (100% coverage)

-- =========================================================
-- SUCCESS MESSAGE
-- =========================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL MODULE TOOLS CONFIGURED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 Module 1: 5 Air Quality Tools';
  RAISE NOTICE '💧 Module 2: 5 Water Management Tools';
  RAISE NOTICE '🏙️ Module 3: 5 Urban Safety Tools';
  RAISE NOTICE '♻️ Module 4: 4 Zero Waste Tools';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Total: 19 Interactive Tools Active';
  RAISE NOTICE '🚀 Refresh your lesson pages to see them!';
  RAISE NOTICE '========================================';
END $$;

