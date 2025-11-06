-- =====================================================
-- CLEAN UP DUPLICATE LESSONS
-- =====================================================
-- Removes duplicate lessons, keeping only the oldest one
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🧹 Starting duplicate lesson cleanup...';
END $$;

-- Delete duplicate lessons, keeping the one with the smallest ID (oldest)
DELETE FROM module_lessons
WHERE id NOT IN (
  SELECT MIN(id)
  FROM module_lessons
  GROUP BY module_id, lesson_order
);

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % duplicate lessons', v_deleted_count;
END $$;

-- Update lesson counts for all modules
UPDATE marketplace_modules m
SET lesson_count = (
  SELECT COUNT(*) 
  FROM module_lessons l 
  WHERE l.module_id = m.id
)
WHERE is_platform_module = TRUE;

DO $$
BEGIN
  RAISE NOTICE '✅ Updated lesson counts';
END $$;

-- Verify the cleanup
DO $$
DECLARE
  v_total_lessons INTEGER;
  v_aire_limpio_count INTEGER;
  v_agua_count INTEGER;
  v_residuos_count INTEGER;
  v_ciudades_count INTEGER;
  v_comercio_count INTEGER;
  v_estrategias_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_lessons FROM module_lessons;
  
  SELECT COUNT(*) INTO v_aire_limpio_count 
  FROM module_lessons l
  JOIN marketplace_modules m ON l.module_id = m.id
  WHERE m.slug = 'aire-limpio-despertar-corporativo';
  
  SELECT COUNT(*) INTO v_agua_count 
  FROM module_lessons l
  JOIN marketplace_modules m ON l.module_id = m.id
  WHERE m.slug = 'gestion-sostenible-agua';
  
  SELECT COUNT(*) INTO v_residuos_count 
  FROM module_lessons l
  JOIN marketplace_modules m ON l.module_id = m.id
  WHERE m.slug = 'economia-circular-cero-residuos';
  
  SELECT COUNT(*) INTO v_ciudades_count 
  FROM module_lessons l
  JOIN marketplace_modules m ON l.module_id = m.id
  WHERE m.slug = 'ciudades-seguras-espacios-inclusivos';
  
  SELECT COUNT(*) INTO v_comercio_count 
  FROM module_lessons l
  JOIN marketplace_modules m ON l.module_id = m.id
  WHERE m.slug = 'comercio-justo-cadenas-valor';
  
  SELECT COUNT(*) INTO v_estrategias_count 
  FROM module_lessons l
  JOIN marketplace_modules m ON l.module_id = m.id
  WHERE m.slug = 'estrategias-avanzadas-calidad-aire';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total lessons: %', v_total_lessons;
  RAISE NOTICE 'Aire Limpio: % lessons', v_aire_limpio_count;
  RAISE NOTICE 'Gestión del Agua: % lessons', v_agua_count;
  RAISE NOTICE 'Economía Circular: % lessons', v_residuos_count;
  RAISE NOTICE 'Ciudades Seguras: % lessons', v_ciudades_count;
  RAISE NOTICE 'Comercio Justo: % lessons', v_comercio_count;
  RAISE NOTICE 'Estrategias Avanzadas: % lessons', v_estrategias_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Expected: 31 total lessons (5+5+6+5+5+5)';
  RAISE NOTICE '';
END $$;

-- Show remaining lessons (should be no duplicates)
SELECT 
  m.title as module_title,
  COUNT(l.id) as lesson_count,
  STRING_AGG(l.title, ', ' ORDER BY l.lesson_order) as lessons
FROM marketplace_modules m
LEFT JOIN module_lessons l ON m.id = l.module_id
WHERE m.is_platform_module = TRUE
GROUP BY m.id, m.title
ORDER BY m.title;

