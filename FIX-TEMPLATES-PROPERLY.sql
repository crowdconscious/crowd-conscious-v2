-- =====================================================
-- FIX TEMPLATES - PROTECT PREMIUM MODULES
-- =====================================================
-- 1. UNMARK platform modules as templates (they're products!)
-- 2. CREATE mock template modules for learning
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing template configuration...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: UNMARK PREMIUM MODULES AS TEMPLATES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '💎 Step 1/2: Protecting premium modules...';
END $$;

-- UNMARK the 6 platform modules - they are PRODUCTS to sell, not templates!
UPDATE marketplace_modules
SET is_template = FALSE
WHERE is_platform_module = TRUE;

DO $$
BEGIN
  RAISE NOTICE '✅ 6 platform modules are now PROTECTED (not clonable)';
END $$;

-- =====================================================
-- STEP 2: CREATE MOCK TEMPLATE MODULES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📚 Step 2/2: Creating mock template modules...';
END $$;

-- Template 1: Basic Clean Air Module (Simple Example)
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, is_template, status, creator_name
  ) VALUES (
    'plantilla-aire-limpio-basico',
    '🌬️ Plantilla: Aire Limpio Básico',
    'Plantilla de ejemplo para crear un módulo sobre calidad del aire. Personalízalo con tu experiencia.',
    'clean_air', 'beginner', 4, 500, 3000, 2000, 180, FALSE, TRUE, 'published', 'Crowd Conscious - Plantillas'
  ) ON CONFLICT (slug) DO UPDATE SET 
    is_template = TRUE,
    status = 'published'
  RETURNING id INTO v_template_id;

  -- Add sample lessons to template
  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward, key_points)
  SELECT v_template_id, lesson_order, title, minutes, xp, ARRAY[point1, point2, point3] FROM (VALUES
    (1, 'Introducción a la Calidad del Aire', 30, 100, 'Qué es la calidad del aire', 'Por qué es importante', 'Cómo medirla'),
    (2, 'Identificando Problemas', 45, 125, 'Fuentes de contaminación', 'Efectos en la salud', 'Casos de éxito'),
    (3, 'Plan de Acción', 45, 125, 'Crear un plan', 'Implementar cambios', 'Medir resultados'),
    (4, 'Reflexión Final', 30, 150, 'Lecciones aprendidas', 'Próximos pasos', 'Compromiso personal')
  ) AS lessons(lesson_order, title, minutes, xp, point1, point2, point3)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Created: Plantilla Aire Limpio Básico';
END $$;

-- Template 2: Basic Water Module (Simple Example)
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, is_template, status, creator_name
  ) VALUES (
    'plantilla-agua-limpia-basico',
    '💧 Plantilla: Agua Limpia Básico',
    'Plantilla de ejemplo para crear un módulo sobre gestión del agua. Clónalo y personalízalo.',
    'clean_water', 'beginner', 4, 500, 3000, 2000, 180, FALSE, TRUE, 'published', 'Crowd Conscious - Plantillas'
  ) ON CONFLICT (slug) DO UPDATE SET 
    is_template = TRUE,
    status = 'published'
  RETURNING id INTO v_template_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward, key_points)
  SELECT v_template_id, lesson_order, title, minutes, xp, ARRAY[point1, point2, point3] FROM (VALUES
    (1, 'El Agua en Nuestra Vida', 30, 100, 'Importancia del agua', 'Consumo actual', 'Oportunidades de ahorro'),
    (2, 'Estrategias de Conservación', 45, 125, 'Técnicas de ahorro', 'Tecnologías disponibles', 'Casos prácticos'),
    (3, 'Plan de Gestión Hídrica', 45, 125, 'Crear tu plan', 'Implementación', 'Seguimiento'),
    (4, 'Compromiso y Acción', 30, 150, 'Tu compromiso', 'Próximos pasos', 'Impacto esperado')
  ) AS lessons(lesson_order, title, minutes, xp, point1, point2, point3)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Created: Plantilla Agua Limpia Básico';
END $$;

-- Template 3: Basic Zero Waste Module (Simple Example)
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO marketplace_modules (
    slug, title, description, core_value, difficulty_level,
    estimated_duration_hours, xp_reward, base_price_mxn, price_per_50_employees,
    individual_price_mxn, is_platform_module, is_template, status, creator_name
  ) VALUES (
    'plantilla-cero-residuos-basico',
    '♻️ Plantilla: Cero Residuos Básico',
    'Plantilla de ejemplo para crear un módulo sobre economía circular y residuos. Personalízala.',
    'zero_waste', 'beginner', 4, 500, 3000, 2000, 180, FALSE, TRUE, 'published', 'Crowd Conscious - Plantillas'
  ) ON CONFLICT (slug) DO UPDATE SET 
    is_template = TRUE,
    status = 'published'
  RETURNING id INTO v_template_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward, key_points)
  SELECT v_template_id, lesson_order, title, minutes, xp, ARRAY[point1, point2, point3] FROM (VALUES
    (1, 'De Desperdicio a Recurso', 30, 100, 'Economía circular', 'El problema de los residuos', 'Oportunidades'),
    (2, 'Auditoría de Residuos', 45, 125, 'Tipos de residuos', 'Medición', 'Análisis'),
    (3, 'Estrategias de Reducción', 45, 125, 'Las 3 R', 'Compostaje', 'Reciclaje'),
    (4, 'Plan Cero Residuos', 30, 150, 'Tu plan de acción', 'Implementación', 'Metas y métricas')
  ) AS lessons(lesson_order, title, minutes, xp, point1, point2, point3)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Created: Plantilla Cero Residuos Básico';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 TEMPLATES FIXED!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
END $$;

-- Show results
SELECT 
  '💎 PREMIUM MODULES (Not Clonable)' as type,
  COUNT(*) as count
FROM marketplace_modules
WHERE is_platform_module = TRUE AND is_template = FALSE
UNION ALL
SELECT 
  '📚 TEMPLATE MODULES (Clonable)',
  COUNT(*)
FROM marketplace_modules
WHERE is_template = TRUE
UNION ALL
SELECT 
  '✅ TOTAL PUBLISHED MODULES',
  COUNT(*)
FROM marketplace_modules
WHERE status = 'published';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was fixed:';
  RAISE NOTICE '✅ 1. 6 platform modules are PROTECTED (not clonable)';
  RAISE NOTICE '✅ 2. 3 mock template modules created for learning';
  RAISE NOTICE '✅ 3. Templates have simple structure for customization';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Users can now:';
  RAISE NOTICE '   - BUY your 6 premium modules ($18,000 MXN each)';
  RAISE NOTICE '   - CLONE the 3 template modules to learn';
  RAISE NOTICE '   - CREATE their own modules from templates';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Test at /marketplace/create';
END $$;

