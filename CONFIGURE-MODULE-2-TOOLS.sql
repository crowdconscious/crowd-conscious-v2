-- =========================================================
-- CONFIGURE MODULE 2 (Agua Limpia) WITH NEW WATER TOOLS
-- =========================================================
-- This script updates module_lessons to display the new
-- water management tools in the lesson pages
-- =========================================================

-- First, let's find the Module 2 UUID
SELECT 
  id,
  title,
  slug
FROM marketplace_modules
WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water';

-- Expected result: Get the module_id (should be something like: 53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce)

-- =========================================================
-- ASSIGN TOOLS TO MODULE 2 LESSONS
-- =========================================================
-- Tool names MUST match the switch cases in the lesson page code:
-- - water-footprint-calculator
-- - water-audit-tool
-- - water-conservation-tracker
-- - water-quality-test-log
-- - recycling-system-designer
-- =========================================================

-- LESSON 1: El Pozo se Seca - Introducción a la Crisis del Agua
-- Tools: Water Footprint Calculator (calculate current usage)
UPDATE module_lessons
SET 
  tools_used = ARRAY['water-footprint-calculator'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water'
  LIMIT 1
)
AND lesson_order = 1;

-- LESSON 2: Midiendo Nuestra Huella Hídrica
-- Tools: Water Audit Tool (room-by-room audit)
UPDATE module_lessons
SET 
  tools_used = ARRAY['water-audit-tool'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water'
  LIMIT 1
)
AND lesson_order = 2;

-- LESSON 3: Estrategias de Conservación
-- Tools: Water Conservation Tracker (set goals & track progress)
UPDATE module_lessons
SET 
  tools_used = ARRAY['water-conservation-tracker'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water'
  LIMIT 1
)
AND lesson_order = 3;

-- LESSON 4: Calidad del Agua y Tratamiento
-- Tools: Water Quality Test Log (monitor water quality)
UPDATE module_lessons
SET 
  tools_used = ARRAY['water-quality-test-log'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water'
  LIMIT 1
)
AND lesson_order = 4;

-- LESSON 5: Sistemas de Reciclaje y Reutilización
-- Tools: Recycling System Designer (design greywater/rainwater systems)
UPDATE module_lessons
SET 
  tools_used = ARRAY['recycling-system-designer'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' OR core_value = 'clean_water'
  LIMIT 1
)
AND lesson_order = 5;

-- =========================================================
-- VERIFY THE UPDATES
-- =========================================================
SELECT 
  ml.lesson_order,
  ml.title as lesson_title,
  ml.tools_used,
  mm.title as module_title
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.slug = 'gestion-sostenible-agua' OR mm.core_value = 'clean_water'
ORDER BY ml.lesson_order;

-- Expected output: Each lesson should now have one tool assigned
-- Lesson 1: ['water-footprint-calculator']
-- Lesson 2: ['water-audit-tool']
-- Lesson 3: ['water-conservation-tracker']
-- Lesson 4: ['water-quality-test-log']
-- Lesson 5: ['recycling-system-designer']

-- =========================================================
-- TOOL VERIFICATION REFERENCE
-- =========================================================
-- These are the exact tool names that MUST be in tools_used
-- to match the switch cases in the lesson page:
--
-- MODULE 2 (Agua Limpia) TOOLS:
-- 1. 'water-footprint-calculator'  → WaterFootprintCalculator component
-- 2. 'water-audit-tool'            → WaterAuditTool component
-- 3. 'water-conservation-tracker'  → WaterConservationTracker component
-- 4. 'water-quality-test-log'      → WaterQualityTestLog component
-- 5. 'recycling-system-designer'   → RecyclingSystemDesigner component
--
-- These names are case-sensitive and must match EXACTLY!
-- =========================================================

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Module 2 tools configuration complete!';
  RAISE NOTICE '🔧 5 water management tools have been assigned to lessons';
  RAISE NOTICE '📝 Run the SELECT query above to verify';
  RAISE NOTICE '🚀 Refresh your lesson pages to see the new tools!';
END $$;

