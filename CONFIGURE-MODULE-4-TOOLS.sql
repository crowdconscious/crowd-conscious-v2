-- =========================================================
-- CONFIGURE MODULE 4 (Cero Residuos) WITH WASTE MANAGEMENT TOOLS
-- =========================================================
-- This script updates module_lessons to display the new
-- circular economy and zero waste tools
-- =========================================================

-- First, let's find the Module 4 UUID
SELECT 
  id,
  title,
  slug,
  core_value
FROM marketplace_modules
WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste';

-- =========================================================
-- ASSIGN TOOLS TO MODULE 4 LESSONS
-- =========================================================
-- Tool names MUST match the switch cases in the lesson page code:
-- - waste-stream-analyzer
-- - five-rs-checklist
-- - composting-calculator
-- - zero-waste-certification-roadmap
-- =========================================================

-- LESSON 1: De Lineal a Circular - Economic Models
-- Tools: Waste Stream Analyzer (categorize & analyze waste)
UPDATE module_lessons
SET 
  tools_used = ARRAY['waste-stream-analyzer'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste'
  LIMIT 1
)
AND lesson_order = 1;

-- LESSON 2: Auditoría de Residuos - Waste Assessment
-- Tools: Waste Stream Analyzer (detailed waste audit)
UPDATE module_lessons
SET 
  tools_used = ARRAY['waste-stream-analyzer'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste'
  LIMIT 1
)
AND lesson_order = 2;

-- LESSON 3: Las 5 R's en Acción - Waste Hierarchy
-- Tools: 5 R's Implementation Checklist (track implementation)
UPDATE module_lessons
SET 
  tools_used = ARRAY['five-rs-checklist'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste'
  LIMIT 1
)
AND lesson_order = 3;

-- LESSON 4: Reciclaje y Valorización - Material Markets
-- Tools: Composting Calculator (organic waste ROI)
UPDATE module_lessons
SET 
  tools_used = ARRAY['composting-calculator'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste'
  LIMIT 1
)
AND lesson_order = 4;

-- LESSON 5: Compostaje Corporativo - Organic Waste Management
-- Tools: Composting Calculator (production & savings)
UPDATE module_lessons
SET 
  tools_used = ARRAY['composting-calculator'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste'
  LIMIT 1
)
AND lesson_order = 5;

-- BONUS: If there's a 6th lesson (Plan Cero Residuos)
-- Tools: Zero Waste Certification Roadmap
UPDATE module_lessons
SET 
  tools_used = ARRAY['zero-waste-certification-roadmap'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' OR core_value = 'zero_waste'
  LIMIT 1
)
AND lesson_order = 6;

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
WHERE mm.slug = 'economia-circular-cero-residuos' OR mm.core_value = 'zero_waste'
ORDER BY ml.lesson_order;

-- Expected output: Each lesson should now have one tool assigned
-- Lesson 1: ['waste-stream-analyzer']
-- Lesson 2: ['waste-stream-analyzer']
-- Lesson 3: ['five-rs-checklist']
-- Lesson 4: ['composting-calculator']
-- Lesson 5: ['composting-calculator']
-- Lesson 6: ['zero-waste-certification-roadmap'] (if exists)

-- =========================================================
-- TOOL VERIFICATION REFERENCE
-- =========================================================
-- These are the exact tool names that MUST be in tools_used
-- to match the switch cases in the lesson page:
--
-- MODULE 4 (Cero Residuos) TOOLS:
-- 1. 'waste-stream-analyzer'             → WasteStreamAnalyzer component
-- 2. 'five-rs-checklist'                 → FiveRsChecklist component
-- 3. 'composting-calculator'             → CompostingCalculator component
-- 4. 'zero-waste-certification-roadmap'  → ZeroWasteCertificationRoadmap component
--
-- These names are case-sensitive and must match EXACTLY!
-- =========================================================

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Module 4 tools configuration complete!';
  RAISE NOTICE '🔧 4 zero waste tools have been assigned to lessons';
  RAISE NOTICE '📝 Run the SELECT query above to verify';
  RAISE NOTICE '🚀 Refresh your lesson pages to see the new tools!';
END $$;

