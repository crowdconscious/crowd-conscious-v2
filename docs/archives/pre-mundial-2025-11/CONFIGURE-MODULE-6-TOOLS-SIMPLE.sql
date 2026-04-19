-- ================================================================
-- CONFIGURE MODULE 6 (Integración de Impacto) TOOLS - SIMPLE VERSION
-- ================================================================
-- This script assigns the 5 Impact Integration tools to Module 6 lessons
-- Run this in Supabase SQL Editor after building the tools
-- ================================================================

-- LESSON 1: Impact Dashboard Builder
UPDATE module_lessons
SET tools_used = ARRAY['impact-dashboard-builder']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' AND status = 'published'
)
AND lesson_order = 1;

-- LESSON 2: ESG Report Generator
UPDATE module_lessons
SET tools_used = ARRAY['esg-report-generator']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' AND status = 'published'
)
AND lesson_order = 2;

-- LESSON 3: Stakeholder Communication Planner
UPDATE module_lessons
SET tools_used = ARRAY['stakeholder-communication-planner']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' AND status = 'published'
)
AND lesson_order = 3;

-- LESSON 4: Certification Hub
UPDATE module_lessons
SET tools_used = ARRAY['certification-hub']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' AND status = 'published'
)
AND lesson_order = 4;

-- LESSON 5: Continuous Improvement Tracker
UPDATE module_lessons
SET tools_used = ARRAY['continuous-improvement-tracker']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' AND status = 'published'
)
AND lesson_order = 5;

-- ================================================================
-- VERIFICATION QUERY (run after to confirm)
-- ================================================================
SELECT 
  mm.title as module_name,
  ml.lesson_order,
  ml.title as lesson_title,
  ml.tools_used
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'impact_integration'
  AND mm.status = 'published'
ORDER BY ml.lesson_order;

