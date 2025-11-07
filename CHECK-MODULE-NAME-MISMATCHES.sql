-- CHECK-MODULE-NAME-MISMATCHES.sql
-- This script checks if module names in database match what's shown in the frontend

-- ============================================
-- PART 1: SHOW ALL PUBLISHED MODULES
-- ============================================
SELECT 
    '🔍 ALL PUBLISHED MODULES' as section,
    id,
    title as database_title,
    slug,
    core_value,
    status
FROM public.marketplace_modules
WHERE status = 'published'
ORDER BY core_value;

-- ============================================
-- PART 2: EXPECTED MODULES (Based on docs)
-- ============================================
-- According to documentation, we should have:
-- 1. Aire Limpio (clean_air)
-- 2. Agua Limpia (clean_water) 
-- 3. Ciudades Seguras (safe_cities)
-- 4. Cero Residuos (zero_waste)
-- 5. Comercio Justo (fair_trade)
-- 6. Integración de Impacto (impact_integration)

-- Check if these exist
SELECT 
    '✅ MODULE EXISTENCE CHECK' as section,
    'clean_air' as core_value,
    EXISTS(SELECT 1 FROM marketplace_modules WHERE core_value = 'clean_air' AND status = 'published') as exists
UNION ALL
SELECT 
    '',
    'clean_water',
    EXISTS(SELECT 1 FROM marketplace_modules WHERE core_value = 'clean_water' AND status = 'published')
UNION ALL
SELECT 
    '',
    'safe_cities',
    EXISTS(SELECT 1 FROM marketplace_modules WHERE core_value = 'safe_cities' AND status = 'published')
UNION ALL
SELECT 
    '',
    'zero_waste',
    EXISTS(SELECT 1 FROM marketplace_modules WHERE core_value = 'zero_waste' AND status = 'published')
UNION ALL
SELECT 
    '',
    'fair_trade',
    EXISTS(SELECT 1 FROM marketplace_modules WHERE core_value = 'fair_trade' AND status = 'published')
UNION ALL
SELECT 
    '',
    'impact_integration',
    EXISTS(SELECT 1 FROM marketplace_modules WHERE core_value = 'impact_integration' AND status = 'published');

-- ============================================
-- PART 3: CHECK FOR DUPLICATE CORE VALUES
-- ============================================
SELECT 
    '⚠️ DUPLICATE CORE VALUES' as section,
    core_value,
    COUNT(*) as count,
    string_agg(title, ' | ') as titles
FROM public.marketplace_modules
WHERE status = 'published'
GROUP BY core_value
HAVING COUNT(*) > 1;

-- ============================================
-- PART 4: FRONTEND vs DATABASE NAME COMPARISON
-- ============================================
-- Frontend shows these names (from your observation):
-- - "Gestión Sostenible del Agua"
-- - "Estrategias Avanzadas de Calidad del Aire"
-- 
-- Database shows:
-- - "Aire Limpio"
-- - "Agua Limpia"

SELECT 
    '📊 TITLE ANALYSIS' as section,
    title,
    slug,
    core_value,
    CASE 
        WHEN title ILIKE '%estrategias%avanzadas%' THEN '⚠️ Advanced module - might be separate from Aire Limpio'
        WHEN title ILIKE '%gestion%sostenible%' THEN '⚠️ Different name than Agua Limpia'
        WHEN title ILIKE '%aire%limpio%' THEN '✅ Matches expected'
        WHEN title ILIKE '%agua%limpia%' THEN '✅ Matches expected'
        ELSE '❓ Check this module'
    END as analysis
FROM public.marketplace_modules
WHERE status = 'published'
ORDER BY core_value;

