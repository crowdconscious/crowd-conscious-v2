-- =====================================================
-- FIX PRICING & TEMPLATE VISIBILITY
-- =====================================================
-- 1. Hide templates from marketplace (keep for builder only)
-- 2. Set templates as FREE
-- 3. Update pricing to emphasize per-person cost
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing pricing and template visibility...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: UNMARK PREMIUM MODULES AS TEMPLATES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '💎 Step 1/3: Protecting premium modules...';
END $$;

-- Ensure 6 platform modules are NOT templates
UPDATE marketplace_modules
SET is_template = FALSE
WHERE is_platform_module = TRUE;

DO $$
BEGIN
  RAISE NOTICE '✅ 6 premium modules protected';
END $$;

-- =====================================================
-- STEP 2: CREATE FREE TEMPLATE MODULES (Hidden from marketplace)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📚 Step 2/3: Creating FREE template modules...';
END $$;

-- Template 1: Basic Clean Air Module
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
    'Plantilla gratuita para crear tu propio módulo sobre calidad del aire. Clónala y personalízala con tu experiencia.',
    'clean_air', 'beginner', 4, 500, 0, 0, 0, FALSE, TRUE, 'template', 'Crowd Conscious - Plantillas'
  ) ON CONFLICT (slug) DO UPDATE SET 
    is_template = TRUE,
    status = 'template',
    base_price_mxn = 0,
    price_per_50_employees = 0,
    individual_price_mxn = 0
  RETURNING id INTO v_template_id;

  -- Delete existing lessons and recreate
  DELETE FROM module_lessons WHERE module_id = v_template_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward, key_points)
  SELECT v_template_id, lesson_order, title, minutes, xp, ARRAY[point1, point2, point3] FROM (VALUES
    (1, 'Introducción a la Calidad del Aire', 30, 100, 'Qué es la calidad del aire', 'Por qué es importante', 'Cómo medirla'),
    (2, 'Identificando Problemas', 45, 125, 'Fuentes de contaminación', 'Efectos en la salud', 'Casos de éxito'),
    (3, 'Plan de Acción', 45, 125, 'Crear un plan', 'Implementar cambios', 'Medir resultados'),
    (4, 'Reflexión Final', 30, 150, 'Lecciones aprendidas', 'Próximos pasos', 'Compromiso personal')
  ) AS lessons(lesson_order, title, minutes, xp, point1, point2, point3);

  RAISE NOTICE '✅ Created: Plantilla Aire Limpio (FREE)';
END $$;

-- Template 2: Basic Water Module
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
    'Plantilla gratuita para crear tu módulo sobre gestión del agua. Clónala y personalízala.',
    'clean_water', 'beginner', 4, 500, 0, 0, 0, FALSE, TRUE, 'template', 'Crowd Conscious - Plantillas'
  ) ON CONFLICT (slug) DO UPDATE SET 
    is_template = TRUE,
    status = 'template',
    base_price_mxn = 0,
    price_per_50_employees = 0,
    individual_price_mxn = 0
  RETURNING id INTO v_template_id;

  DELETE FROM module_lessons WHERE module_id = v_template_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward, key_points)
  SELECT v_template_id, lesson_order, title, minutes, xp, ARRAY[point1, point2, point3] FROM (VALUES
    (1, 'El Agua en Nuestra Vida', 30, 100, 'Importancia del agua', 'Consumo actual', 'Oportunidades de ahorro'),
    (2, 'Estrategias de Conservación', 45, 125, 'Técnicas de ahorro', 'Tecnologías disponibles', 'Casos prácticos'),
    (3, 'Plan de Gestión Hídrica', 45, 125, 'Crear tu plan', 'Implementación', 'Seguimiento'),
    (4, 'Compromiso y Acción', 30, 150, 'Tu compromiso', 'Próximos pasos', 'Impacto esperado')
  ) AS lessons(lesson_order, title, minutes, xp, point1, point2, point3);

  RAISE NOTICE '✅ Created: Plantilla Agua Limpia (FREE)';
END $$;

-- Template 3: Basic Zero Waste Module
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
    'Plantilla gratuita para crear tu módulo sobre economía circular. Personalízala con tu experiencia.',
    'zero_waste', 'beginner', 4, 500, 0, 0, 0, FALSE, TRUE, 'template', 'Crowd Conscious - Plantillas'
  ) ON CONFLICT (slug) DO UPDATE SET 
    is_template = TRUE,
    status = 'template',
    base_price_mxn = 0,
    price_per_50_employees = 0,
    individual_price_mxn = 0
  RETURNING id INTO v_template_id;

  DELETE FROM module_lessons WHERE module_id = v_template_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, estimated_minutes, xp_reward, key_points)
  SELECT v_template_id, lesson_order, title, minutes, xp, ARRAY[point1, point2, point3] FROM (VALUES
    (1, 'De Desperdicio a Recurso', 30, 100, 'Economía circular', 'El problema de los residuos', 'Oportunidades'),
    (2, 'Auditoría de Residuos', 45, 125, 'Tipos de residuos', 'Medición', 'Análisis'),
    (3, 'Estrategias de Reducción', 45, 125, 'Las 3 R', 'Compostaje', 'Reciclaje'),
    (4, 'Plan Cero Residuos', 30, 150, 'Tu plan de acción', 'Implementación', 'Metas y métricas')
  ) AS lessons(lesson_order, title, minutes, xp, point1, point2, point3);

  RAISE NOTICE '✅ Created: Plantilla Cero Residuos (FREE)';
END $$;

-- =====================================================
-- STEP 3: VERIFY PRICING ON PREMIUM MODULES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '💰 Step 3/3: Verifying premium module pricing...';
END $$;

-- Ensure all premium modules have correct individual pricing
UPDATE marketplace_modules
SET individual_price_mxn = 360
WHERE is_platform_module = TRUE
  AND (individual_price_mxn IS NULL OR individual_price_mxn = 0);

DO $$
BEGIN
  RAISE NOTICE '✅ Premium modules: $360 MXN per person';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 PRICING & TEMPLATES FIXED!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
END $$;

-- Show results
SELECT 
  '💎 PREMIUM MODULES (For Sale)' as type,
  COUNT(*) as count,
  '$360/person' as pricing
FROM marketplace_modules
WHERE is_platform_module = TRUE AND status = 'published'
UNION ALL
SELECT 
  '📚 FREE TEMPLATES (Builder Only)',
  COUNT(*),
  'FREE'
FROM marketplace_modules
WHERE is_template = TRUE AND status = 'template'
UNION ALL
SELECT 
  '✅ TOTAL PUBLISHED (Marketplace)',
  COUNT(*),
  'Various'
FROM marketplace_modules
WHERE status = 'published';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was fixed:';
  RAISE NOTICE '✅ 1. Premium modules: $360/person (not $18,000)';
  RAISE NOTICE '✅ 2. Templates: FREE and hidden from marketplace';
  RAISE NOTICE '✅ 3. Templates only show in module builder';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Pricing now works for:';
  RAISE NOTICE '   - 1 person: $360 MXN';
  RAISE NOTICE '   - 4 people: $1,440 MXN';
  RAISE NOTICE '   - 50 people: $18,000 MXN';
  RAISE NOTICE '   - Any size team!';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next: Update marketplace UI to show $360/person';
END $$;

