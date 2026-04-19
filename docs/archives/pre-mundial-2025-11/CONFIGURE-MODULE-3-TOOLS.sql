-- =========================================================
-- CONFIGURE MODULE 3 (Ciudades Seguras) WITH SAFETY TOOLS
-- =========================================================
-- This script updates module_lessons to display the new
-- urban safety and inclusive spaces tools
-- =========================================================

-- First, let's find the Module 3 UUID
SELECT 
  id,
  title,
  slug,
  core_value
FROM marketplace_modules
WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities';

-- =========================================================
-- ASSIGN TOOLS TO MODULE 3 LESSONS
-- =========================================================
-- Tool names MUST match the switch cases in the lesson page code:
-- - security-audit-tool
-- - community-survey-tool
-- - cost-calculator (for safety improvements)
-- Note: Module 3 has 3 main tools (CPTED and Design Planner can be added later)
-- =========================================================

-- LESSON 1: Principios de Seguridad Urbana - Safety Fundamentals
-- Tools: Security Audit Tool (identify security risks)
UPDATE module_lessons
SET 
  tools_used = ARRAY['security-audit-tool'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities'
  LIMIT 1
)
AND lesson_order = 1;

-- LESSON 2: Mapeo de Seguridad - Risk Assessment
-- Tools: Community Survey Tool (gather community input)
UPDATE module_lessons
SET 
  tools_used = ARRAY['community-survey-tool'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities'
  LIMIT 1
)
AND lesson_order = 2;

-- LESSON 3: Diseño de Espacios Seguros - Environmental Design
-- Tools: Security Audit Tool (CPTED principles application)
UPDATE module_lessons
SET 
  tools_used = ARRAY['security-audit-tool'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities'
  LIMIT 1
)
AND lesson_order = 3;

-- LESSON 4: Movilidad Segura - Transportation Safety
-- Tools: Community Survey Tool (mobility assessment)
UPDATE module_lessons
SET 
  tools_used = ARRAY['community-survey-tool'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities'
  LIMIT 1
)
AND lesson_order = 4;

-- LESSON 5: Plan de Seguridad Comunitaria - Collaborative Action
-- Tools: Cost Calculator (budget safety improvements)
UPDATE module_lessons
SET 
  tools_used = ARRAY['cost-calculator'],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' OR core_value = 'safe_cities'
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
WHERE mm.slug = 'ciudades-seguras-espacios-inclusivos' OR mm.core_value = 'safe_cities'
ORDER BY ml.lesson_order;

-- Expected output: Each lesson should now have one tool assigned
-- Lesson 1: ['security-audit-tool']
-- Lesson 2: ['community-survey-tool']
-- Lesson 3: ['security-audit-tool']
-- Lesson 4: ['community-survey-tool']
-- Lesson 5: ['cost-calculator']

-- =========================================================
-- TOOL VERIFICATION REFERENCE
-- =========================================================
-- These are the exact tool names that MUST be in tools_used
-- to match the switch cases in the lesson page:
--
-- MODULE 3 (Ciudades Seguras) TOOLS:
-- 1. 'security-audit-tool'     → SecurityAuditTool component
-- 2. 'community-survey-tool'   → CommunitySurveyTool component
-- 3. 'cost-calculator'         → CostCalculatorTool component
--
-- These names are case-sensitive and must match EXACTLY!
-- =========================================================

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Module 3 tools configuration complete!';
  RAISE NOTICE '🔧 Urban safety tools have been assigned to lessons';
  RAISE NOTICE '📝 Run the SELECT query above to verify';
  RAISE NOTICE '🚀 Refresh your lesson pages to see the new tools!';
END $$;

