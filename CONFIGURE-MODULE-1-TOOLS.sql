-- =========================================================
-- CONFIGURE MODULE 1 (Aire Limpio) WITH AIR QUALITY TOOLS
-- =========================================================
-- This script updates module_lessons to display the new
-- air quality tools in the lesson pages
-- =========================================================

-- First, let's find the Module 1 UUID
SELECT 
  id,
  title,
  slug,
  core_value
FROM marketplace_modules
WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air'
ORDER BY created_at DESC;

-- =========================================================
-- ASSIGN TOOLS TO MODULE 1 LESSONS
-- =========================================================
-- Tool names MUST match the switch cases in the lesson page code:
-- - air-quality-assessment
-- - emission-source-identifier
-- - air-quality-roi
-- - implementation-timeline
-- - air-quality-monitor
-- =========================================================

-- LESSON 1: El Impacto Invisible - Air Quality Fundamentals
-- Tools: Air Quality Assessment (6-question evaluation)
UPDATE module_lessons
SET 
  tools_used = ARRAY['air-quality-assessment'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air'
  ORDER BY created_at DESC
  LIMIT 1
)
AND lesson_order = 1;

-- LESSON 2: Identificando Fuentes de Emisión - Emission Mapping
-- Tools: Emission Source Identifier (facility mapping)
UPDATE module_lessons
SET 
  tools_used = ARRAY['emission-source-identifier'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air'
  ORDER BY created_at DESC
  LIMIT 1
)
AND lesson_order = 2;

-- LESSON 3: Calculando el ROI - Financial Justification
-- Tools: Air Quality ROI Calculator (3-year projections)
UPDATE module_lessons
SET 
  tools_used = ARRAY['air-quality-roi'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air'
  ORDER BY created_at DESC
  LIMIT 1
)
AND lesson_order = 3;

-- LESSON 4: Plan de Acción 90 Días - Implementation Planning
-- Tools: Implementation Timeline Planner (90-day action plan)
UPDATE module_lessons
SET 
  tools_used = ARRAY['implementation-timeline'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air'
  ORDER BY created_at DESC
  LIMIT 1
)
AND lesson_order = 4;

-- LESSON 5: Reflexión y Compromiso - Monitoring & Tracking
-- Tools: Air Quality Monitor Tracker (ongoing monitoring)
UPDATE module_lessons
SET 
  tools_used = ARRAY['air-quality-monitor'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' OR core_value = 'clean_air'
  ORDER BY created_at DESC
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
  mm.title as module_title,
  mm.slug
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.slug = 'estrategias-avanzadas-calidad-aire' OR mm.core_value = 'clean_air'
ORDER BY mm.created_at DESC, ml.lesson_order
LIMIT 5;

-- Expected output: Each lesson should now have one tool assigned
-- Lesson 1: ['air-quality-assessment']
-- Lesson 2: ['emission-source-identifier']
-- Lesson 3: ['air-quality-roi']
-- Lesson 4: ['implementation-timeline']
-- Lesson 5: ['air-quality-monitor']

-- =========================================================
-- TOOL VERIFICATION REFERENCE
-- =========================================================
-- These are the exact tool names that MUST be in tools_used
-- to match the switch cases in the lesson page:
--
-- MODULE 1 (Aire Limpio) TOOLS:
-- 1. 'air-quality-assessment'      → AirQualityAssessment component
-- 2. 'emission-source-identifier'  → EmissionSourceIdentifier component
-- 3. 'air-quality-roi'             → AirQualityROI component
-- 4. 'implementation-timeline'     → ImplementationTimelinePlanner component
-- 5. 'air-quality-monitor'         → AirQualityMonitorTracker component
--
-- These names are case-sensitive and must match EXACTLY!
-- =========================================================

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Module 1 tools configuration complete!';
  RAISE NOTICE '🔧 5 air quality tools have been assigned to lessons';
  RAISE NOTICE '📝 Run the SELECT query above to verify';
  RAISE NOTICE '🚀 Refresh your lesson pages to see the new tools!';
END $$;

