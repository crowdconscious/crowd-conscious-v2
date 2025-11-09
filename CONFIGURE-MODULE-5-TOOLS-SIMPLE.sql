-- ================================================================
-- CONFIGURE MODULE 5 (Comercio Justo) TOOLS - SIMPLE VERSION
-- ================================================================
-- This script assigns the 5 Fair Trade tools to Module 5 lessons
-- Run this in Supabase SQL Editor after building the tools
-- ================================================================

-- LESSON 1: Supply Chain Mapper
UPDATE module_lessons
SET tools_used = ARRAY['supply-chain-mapper']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' AND is_published = true
)
AND lesson_order = 1;

-- LESSON 2: Fair Wage Calculator
UPDATE module_lessons
SET tools_used = ARRAY['fair-wage-calculator']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' AND is_published = true
)
AND lesson_order = 2;

-- LESSON 3: Local Supplier Finder + Procurement Scorecard
UPDATE module_lessons
SET tools_used = ARRAY['local-supplier-finder', 'responsible-procurement-scorecard']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' AND is_published = true
)
AND lesson_order = 3;

-- LESSON 4: Responsible Procurement Scorecard
UPDATE module_lessons
SET tools_used = ARRAY['responsible-procurement-scorecard']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' AND is_published = true
)
AND lesson_order = 4;

-- LESSON 5: Impact Report Generator
UPDATE module_lessons
SET tools_used = ARRAY['impact-report-generator']::TEXT[]
WHERE module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' AND is_published = true
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
WHERE mm.core_value = 'fair_trade'
  AND mm.is_published = true
ORDER BY ml.lesson_order;

