-- STANDARDIZE-MODULE-NAMES.sql
-- This script standardizes all module names to match marketplace naming
-- Keeps modules WITH lessons (enriched content) and deletes duplicates

BEGIN;

-- ============================================
-- STEP 1: Show current state
-- ============================================
SELECT 
    '📊 CURRENT STATE' as section,
    mm.id,
    mm.title,
    mm.slug,
    mm.core_value,
    COUNT(ml.id) as lesson_count,
    CASE 
        WHEN COUNT(ml.id) > 0 THEN '✅ HAS LESSONS - KEEP & RENAME'
        ELSE '❌ NO LESSONS - DELETE'
    END as decision
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.title, mm.slug, mm.core_value
ORDER BY mm.core_value, lesson_count DESC;

-- ============================================
-- STEP 2: Rename modules WITH lessons to marketplace names
-- ============================================

-- Module 1: Aire Limpio (clean_air) 
-- Keep the one with 5 lessons, rename to marketplace name
UPDATE marketplace_modules
SET 
    title = 'Estrategias Avanzadas de Calidad del Aire',
    slug = 'estrategias-avanzadas-calidad-aire',
    description = 'Aprende estrategias avanzadas para mejorar la calidad del aire en tu organización y comunidad. Incluye herramientas interactivas, casos reales y certificación.',
    updated_at = NOW()
WHERE id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND core_value = 'clean_air';

-- Module 2: Agua Limpia (clean_water)
-- Rename to marketplace name
UPDATE marketplace_modules
SET 
    title = 'Gestión Sostenible del Agua',
    slug = 'gestion-sostenible-agua',
    description = 'Domina las mejores prácticas de gestión del agua, desde auditorías hídricas hasta sistemas de reciclaje. Aprende a reducir costos y conservar recursos.',
    updated_at = NOW()
WHERE core_value = 'clean_water'
AND id IN (
    SELECT mm.id FROM marketplace_modules mm
    JOIN module_lessons ml ON mm.id = ml.module_id
    WHERE mm.core_value = 'clean_water'
    GROUP BY mm.id
    HAVING COUNT(ml.id) > 0
    LIMIT 1
);

-- Module 3: Ciudades Seguras (safe_cities)
UPDATE marketplace_modules
SET 
    title = 'Ciudades Seguras y Espacios Inclusivos',
    slug = 'ciudades-seguras-espacios-inclusivos',
    description = 'Aprende a crear espacios urbanos más seguros e inclusivos. Desde auditorías de seguridad hasta diseño CPTED y movilidad sostenible.',
    updated_at = NOW()
WHERE core_value = 'safe_cities'
AND status = 'published';

-- Module 4: Cero Residuos (zero_waste)
UPDATE marketplace_modules
SET 
    title = 'Economía Circular: Cero Residuos',
    slug = 'economia-circular-cero-residuos',
    description = 'Transforma tu modelo de negocio con principios de economía circular. De basura a recurso: aprende las 5 R\'s y crea valor desde los residuos.',
    updated_at = NOW()
WHERE core_value = 'zero_waste'
AND id IN (
    SELECT mm.id FROM marketplace_modules mm
    LEFT JOIN module_lessons ml ON mm.id = ml.module_id
    WHERE mm.core_value = 'zero_waste'
    GROUP BY mm.id
    ORDER BY COUNT(ml.id) DESC
    LIMIT 1
);

-- Module 5: Comercio Justo (fair_trade)
UPDATE marketplace_modules
SET 
    title = 'Comercio Justo y Cadenas de Valor',
    slug = 'comercio-justo-cadenas-valor',
    description = 'Construye cadenas de valor éticas y sostenibles. Aprende sobre comercio justo, sourcing local y salarios dignos.',
    updated_at = NOW()
WHERE core_value = 'fair_trade'
AND status = 'published';

-- ============================================
-- STEP 3: Delete duplicate modules (ones WITHOUT lessons)
-- ============================================

-- Delete clean_air duplicates (keep the one we just renamed)
DELETE FROM marketplace_modules
WHERE core_value = 'clean_air'
AND id != '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND status = 'published';

-- Delete clean_water duplicates (keep the one with lessons)
DELETE FROM marketplace_modules
WHERE core_value = 'clean_water'
AND id NOT IN (
    SELECT mm.id FROM marketplace_modules mm
    JOIN module_lessons ml ON mm.id = ml.module_id
    WHERE mm.core_value = 'clean_water'
    GROUP BY mm.id
    HAVING COUNT(ml.id) > 0
    LIMIT 1
)
AND status = 'published';

-- Delete zero_waste duplicates (keep the one with most lessons)
DELETE FROM marketplace_modules
WHERE core_value = 'zero_waste'
AND id NOT IN (
    SELECT mm.id FROM marketplace_modules mm
    LEFT JOIN module_lessons ml ON mm.id = ml.module_id
    WHERE mm.core_value = 'zero_waste'
    GROUP BY mm.id
    ORDER BY COUNT(ml.id) DESC
    LIMIT 1
)
AND status = 'published';

-- ============================================
-- STEP 4: Verify final state
-- ============================================
SELECT 
    '✅ FINAL STATE' as section,
    mm.id,
    mm.title,
    mm.slug,
    mm.core_value,
    COUNT(ml.id) as lesson_count,
    mm.base_price_mxn,
    mm.status
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.title, mm.slug, mm.core_value, mm.base_price_mxn, mm.status
ORDER BY mm.core_value;

-- ============================================
-- STEP 5: Check for remaining duplicates
-- ============================================
SELECT 
    '⚠️ DUPLICATE CHECK' as check_type,
    core_value,
    COUNT(*) as module_count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ OK'
        ELSE '❌ STILL HAS DUPLICATES!'
    END as status
FROM marketplace_modules
WHERE status = 'published'
AND core_value IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade')
GROUP BY core_value
ORDER BY core_value;

COMMIT;

-- ============================================
-- EXPECTED RESULT:
-- ============================================
-- ✅ 5 modules total (1 per core_value)
-- ✅ All have marketplace-friendly names:
--    - "Estrategias Avanzadas de Calidad del Aire" (clean_air)
--    - "Gestión Sostenible del Agua" (clean_water)
--    - "Ciudades Seguras y Espacios Inclusivos" (safe_cities)
--    - "Economía Circular: Cero Residuos" (zero_waste)
--    - "Comercio Justo y Cadenas de Valor" (fair_trade)
-- ✅ No duplicates
-- ✅ All enriched content preserved

