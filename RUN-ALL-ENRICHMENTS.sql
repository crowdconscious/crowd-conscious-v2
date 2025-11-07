-- ============================================
-- MASTER ENRICHMENT FILE
-- Runs ALL module enrichments (2, 3, 4, 5, 6) in sequence
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Copy this ENTIRE file
-- 3. Paste and run
-- 4. Wait ~30 seconds for completion
-- 5. Check verification output at end
--
-- NOTE: Module 1 (Clean Air) already enriched, skipping
-- ============================================

BEGIN;

RAISE NOTICE '🚀 Starting enrichment of 30 lessons across 5 modules...';

-- ============================================
-- MODULE 2: AGUA LIMPIA (CLEAN WATER)
-- ============================================

RAISE NOTICE '💧 Enriching Module 2: Gestión Sostenible del Agua (5 lessons)...';

-- Run Module 2 enrichment
\i ENRICH-MODULE-2-ALL-LESSONS.sql

RAISE NOTICE '✅ Module 2 complete!';

-- ============================================
-- MODULE 3: CIUDADES SEGURAS (SAFE CITIES)
-- ============================================

RAISE NOTICE '🏙️ Enriching Module 3: Ciudades Seguras y Espacios Inclusivos (5 lessons)...';

-- Run Module 3 enrichment
\i ENRICH-MODULE-3-ALL-LESSONS.sql

RAISE NOTICE '✅ Module 3 complete!';

-- ============================================
-- MODULE 4: CERO RESIDUOS (ZERO WASTE)
-- ============================================

RAISE NOTICE '♻️ Enriching Module 4: Economía Circular - Cero Residuos (5 lessons)...';

-- Run Module 4 enrichment
\i ENRICH-MODULE-4-ALL-LESSONS.sql

RAISE NOTICE '✅ Module 4 complete!';

-- ============================================
-- MODULE 5: COMERCIO JUSTO (FAIR TRADE)
-- ============================================

RAISE NOTICE '🤝 Enriching Module 5: Comercio Justo y Cadenas de Valor (5 lessons)...';

-- Run Module 5 enrichment
\i ENRICH-MODULE-5-ALL-LESSONS.sql

RAISE NOTICE '✅ Module 5 complete!';

-- ============================================
-- MODULE 6: INTEGRACIÓN DE IMPACTO
-- ============================================

RAISE NOTICE '🎉 Enriching Module 6: Integración de Impacto y Medición (5 lessons)...';

-- Run Module 6 enrichment
\i ENRICH-MODULE-6-ALL-LESSONS.sql

RAISE NOTICE '✅ Module 6 complete!';

-- ============================================
-- FINAL VERIFICATION
-- ============================================

RAISE NOTICE '🔍 Verifying all enrichments...';

SELECT 
    '✅ ENRICHMENT COMPLETE!' as status,
    COUNT(*) as total_lessons_enriched,
    COUNT(*) FILTER (WHERE story_content IS NOT NULL) as lessons_with_story,
    COUNT(*) FILTER (WHERE activity_config IS NOT NULL) as lessons_with_activity,
    COUNT(*) FILTER (WHERE learning_objectives IS NOT NULL) as lessons_with_objectives
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.status = 'published'
  AND mm.core_value IN ('clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'impact_integration');

-- Show summary by module
SELECT 
    mm.core_value,
    mm.title,
    COUNT(ml.id) as lesson_count,
    COUNT(*) FILTER (WHERE ml.story_content IS NOT NULL) as enriched_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE ml.story_content IS NOT NULL) = COUNT(ml.id) THEN '✅ Complete'
        ELSE '⚠️ Incomplete'
    END as status
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.core_value, mm.title
ORDER BY mm.core_value;

RAISE NOTICE '🎉🎉🎉 ALL MODULES ENRICHED! Platform ready for students! 🎉🎉🎉';

COMMIT;

