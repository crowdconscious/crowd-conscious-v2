-- CLEANUP-DUPLICATE-MODULES.sql
-- This script removes duplicate modules, keeping only the cleanest versions

-- ⚠️ CRITICAL: Run this to clean up your module mess!
-- This will keep ONE module per core_value (the one with the cleanest slug)

BEGIN;

-- ============================================
-- STEP 1: Show what will be deleted
-- ============================================
SELECT 
    '🗑️ MODULES TO DELETE' as action,
    id,
    title,
    slug,
    core_value,
    CASE 
        WHEN slug LIKE '%-1762180427' THEN '❌ Has timestamp suffix - DELETE'
        WHEN core_value = 'clean_air' AND title = 'Estrategias Avanzadas de Calidad del Aire' THEN '❌ Duplicate clean_air - DELETE'
        WHEN core_value = 'clean_air' AND slug = 'aire-limpio-el-despertar-corporativo-1762180427' THEN '❌ Timestamped version - DELETE'
        ELSE '✅ KEEP'
    END as decision
FROM marketplace_modules
WHERE status = 'published'
ORDER BY core_value, title;

-- ============================================
-- STEP 2: Delete timestamped duplicates
-- ============================================
-- These are the "-1762180427" versions

DELETE FROM marketplace_modules
WHERE slug IN (
    'aire-limpio-el-despertar-corporativo-1762180427',
    'estrategias-avanzadas-calidad-aire-1762180427',
    'gestion-sostenible-agua-1762180427',
    'economia-circular-cero-residuos-1762180427'
)
AND status = 'published';

-- ============================================
-- STEP 3: Delete one of the duplicate Estrategias Avanzadas
-- ============================================
-- Keep the one with the cleaner slug
DELETE FROM marketplace_modules
WHERE id = 'cc5632ac-d800-43c5-829e-074333dd3024'
AND slug = 'estrategias-avanzadas-calidad-aire';

-- ============================================
-- STEP 4: Delete one of the duplicate Agua Limpia  
-- ============================================
-- Keep the one WITHOUT timestamp
DELETE FROM marketplace_modules
WHERE id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
AND slug = 'gestion-sostenible-agua-1762180427';

-- ============================================
-- STEP 5: Delete one of the duplicate Cero Residuos
-- ============================================
-- Keep the one WITHOUT timestamp
DELETE FROM marketplace_modules
WHERE id = '01887731-3f85-414b-97bc-8d2a62f77a91'
AND slug = 'economia-circular-cero-residuos-1762180427';

-- ============================================
-- STEP 6: Verify final state
-- ============================================
SELECT 
    '✅ REMAINING MODULES' as result,
    core_value,
    COUNT(*) as module_count,
    string_agg(title, ' | ') as titles,
    string_agg(id::text, ' | ') as ids
FROM marketplace_modules
WHERE status = 'published'
GROUP BY core_value
ORDER BY core_value;

-- ============================================
-- FINAL CHECK: Should be 1 module per core_value (except clean_air can have 2)
-- ============================================
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ WARNING: Still have duplicates!'
        ELSE '✅ SUCCESS: All cleaned up!'
    END as status,
    core_value,
    COUNT(*) as count
FROM marketplace_modules
WHERE status = 'published'
GROUP BY core_value
HAVING COUNT(*) > 2 -- Allow 2 for clean_air (beginner + advanced)
ORDER BY core_value;

COMMIT;

-- ✅ After running this, you should have:
-- - 2x clean_air (Aire Limpio + Estrategias Avanzadas)
-- - 1x clean_water (Gestión Sostenible del Agua)
-- - 1x safe_cities
-- - 1x zero_waste  
-- - 1x fair_trade
-- - (1x biodiversity template - optional)

