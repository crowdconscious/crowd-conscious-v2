-- =====================================================
-- FORCE INSERT LESSONS - Delete and recreate
-- =====================================================
-- This will FORCE insert lessons even if they exist
-- Run this if ADD-LESSONS-ONLY.sql didn't work
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔥 FORCE INSERTING LESSONS...';
END $$;

-- Step 1: DELETE all existing lessons (start fresh)
DELETE FROM module_lessons WHERE module_id IN (
  SELECT id FROM marketplace_modules WHERE is_platform_module = TRUE
);

DO $$
BEGIN
  RAISE NOTICE '✅ Cleared existing lessons';
END $$;

-- Step 2: Insert lessons for Aire Limpio
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id 
  FROM marketplace_modules 
  WHERE slug = 'aire-limpio-despertar-corporativo' AND is_platform_module = TRUE;

  IF v_module_id IS NOT NULL THEN
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points) VALUES
    (v_module_id, 1, 'El Impacto Invisible', 'Comprende cómo la calidad del aire afecta la salud y productividad en tu organización.', 45, 200, ARRAY['Calidad del aire', 'Salud organizacional', 'Productividad']),
    (v_module_id, 2, 'Identificando Fuentes de Emisión', 'Aprende a identificar y mapear las principales fuentes de contaminación en espacios de trabajo.', 60, 250, ARRAY['Fuentes de emisión', 'Mapeo de contaminación', 'Análisis ambiental']),
    (v_module_id, 3, 'Calculando el ROI', 'Descubre el retorno de inversión de mejorar la calidad del aire en tu empresa.', 45, 200, ARRAY['ROI ambiental', 'Análisis financiero', 'Beneficios económicos']),
    (v_module_id, 4, 'Plan de Acción 90 Días', 'Desarrolla un plan de implementación práctico de 90 días para mejorar la calidad del aire.', 60, 250, ARRAY['Planificación', 'Implementación', 'Estrategia ambiental']),
    (v_module_id, 5, 'Reflexión y Compromiso', 'Consolida tu aprendizaje y comprométete con acciones concretas para el cambio.', 30, 100, ARRAY['Reflexión', 'Compromiso', 'Plan de acción']);
    
    RAISE NOTICE '✅ Inserted 5 lessons for Aire Limpio (module: %)', v_module_id;
  ELSE
    RAISE WARNING '❌ Module aire-limpio-despertar-corporativo not found';
  END IF;
END $$;

-- Step 3: Insert lessons for Estrategias Avanzadas de Calidad del Aire
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id 
  FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' AND is_platform_module = TRUE;

  IF v_module_id IS NOT NULL THEN
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points) VALUES
    (v_module_id, 1, 'Monitoreo Avanzado', 'Sistemas avanzados de monitoreo de calidad del aire en tiempo real.', 60, 250, ARRAY['Monitoreo', 'Tecnología', 'Tiempo real']),
    (v_module_id, 2, 'Optimización HVAC', 'Técnicas de optimización de sistemas de ventilación y climatización.', 60, 250, ARRAY['HVAC', 'Ventilación', 'Optimización']),
    (v_module_id, 3, 'Flota Verde', 'Estrategias de electrificación y gestión de flotas vehiculares.', 60, 250, ARRAY['Electrificación', 'Flota verde', 'Movilidad']),
    (v_module_id, 4, 'Certificaciones Internacionales', 'Procesos de certificación ISO 14001 y otras normas ambientales.', 45, 200, ARRAY['ISO 14001', 'Certificaciones', 'Normas']),
    (v_module_id, 5, 'Plan Maestro Trienal', 'Desarrollo de un plan estratégico de 3 años para calidad del aire.', 75, 300, ARRAY['Plan maestro', 'Estrategia', 'Largo plazo']);
    
    RAISE NOTICE '✅ Inserted 5 lessons for Estrategias Avanzadas (module: %)', v_module_id;
  ELSE
    RAISE WARNING '❌ Module estrategias-avanzadas-calidad-aire not found';
  END IF;
END $$;

-- Step 4: Insert lessons for Gestión Sostenible del Agua
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id 
  FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' AND is_platform_module = TRUE;

  IF v_module_id IS NOT NULL THEN
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points) VALUES
    (v_module_id, 1, 'El Agua en tu Empresa', 'Evaluación del impacto hídrico de tu organización.', 45, 200, ARRAY['Impacto hídrico', 'Evaluación', 'Consumo']),
    (v_module_id, 2, 'Huella Hídrica Corporativa', 'Cálculo y análisis de la huella hídrica organizacional.', 60, 250, ARRAY['Huella hídrica', 'Medición', 'Análisis']),
    (v_module_id, 3, 'Estrategias de Ahorro', 'Técnicas prácticas de conservación y ahorro de agua.', 60, 250, ARRAY['Ahorro', 'Conservación', 'Eficiencia']),
    (v_module_id, 4, 'Calidad y Tratamiento', 'Gestión de calidad del agua y sistemas de tratamiento.', 45, 200, ARRAY['Calidad', 'Tratamiento', 'Gestión']),
    (v_module_id, 5, 'Plan de Gestión Hídrica', 'Desarrollo de un plan integral de gestión sostenible del agua.', 60, 250, ARRAY['Plan hídrico', 'Gestión integral', 'Sostenibilidad']);
    
    RAISE NOTICE '✅ Inserted 5 lessons for Gestión del Agua (module: %)', v_module_id;
  ELSE
    RAISE WARNING '❌ Module gestion-sostenible-agua not found';
  END IF;
END $$;

-- Step 5: Insert lessons for Economía Circular
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id 
  FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' AND is_platform_module = TRUE;

  IF v_module_id IS NOT NULL THEN
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points) VALUES
    (v_module_id, 1, 'De Lineal a Circular', 'Transición del modelo lineal al modelo de economía circular.', 45, 200, ARRAY['Economía circular', 'Modelos', 'Transición']),
    (v_module_id, 2, 'Auditoría de Residuos', 'Análisis completo de flujos de residuos organizacionales.', 60, 250, ARRAY['Auditoría', 'Residuos', 'Análisis']),
    (v_module_id, 3, 'Las 5 Rs en Acción', 'Implementación práctica de Rechazar, Reducir, Reusar, Reciclar, Regenerar.', 60, 250, ARRAY['5 Rs', 'Implementación', 'Práctica']),
    (v_module_id, 4, 'Reciclaje y Valorización', 'Estrategias de reciclaje y valorización de materiales.', 60, 250, ARRAY['Reciclaje', 'Valorización', 'Materiales']),
    (v_module_id, 5, 'Compostaje Corporativo', 'Sistemas de compostaje y gestión de residuos orgánicos.', 45, 200, ARRAY['Compostaje', 'Orgánicos', 'Gestión']),
    (v_module_id, 6, 'Plan Cero Residuos', 'Desarrollo de estrategia integral hacia cero residuos.', 75, 300, ARRAY['Cero residuos', 'Estrategia', 'Plan integral']);
    
    RAISE NOTICE '✅ Inserted 6 lessons for Economía Circular (module: %)', v_module_id;
  ELSE
    RAISE WARNING '❌ Module economia-circular-cero-residuos not found';
  END IF;
END $$;

-- Step 6: Insert lessons for Ciudades Seguras
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id 
  FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' AND is_platform_module = TRUE;

  IF v_module_id IS NOT NULL THEN
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points) VALUES
    (v_module_id, 1, 'Principios de Seguridad Urbana', 'Fundamentos de seguridad y diseño urbano inclusivo.', 45, 200, ARRAY['Seguridad urbana', 'Principios', 'Diseño']),
    (v_module_id, 2, 'Mapeo de Seguridad Comunitaria', 'Técnicas de mapeo y evaluación de seguridad.', 60, 250, ARRAY['Mapeo', 'Evaluación', 'Comunidad']),
    (v_module_id, 3, 'Diseño de Espacios Seguros', 'CPTED y diseño ambiental para prevención del crimen.', 60, 250, ARRAY['CPTED', 'Diseño', 'Prevención']),
    (v_module_id, 4, 'Movilidad Segura e Inclusiva', 'Planificación de movilidad accesible y segura.', 45, 200, ARRAY['Movilidad', 'Accesibilidad', 'Seguridad']),
    (v_module_id, 5, 'Plan de Seguridad Comunitaria', 'Desarrollo de plan colaborativo de seguridad.', 60, 250, ARRAY['Plan comunitario', 'Colaboración', 'Seguridad']);
    
    RAISE NOTICE '✅ Inserted 5 lessons for Ciudades Seguras (module: %)', v_module_id;
  ELSE
    RAISE WARNING '❌ Module ciudades-seguras-espacios-inclusivos not found';
  END IF;
END $$;

-- Step 7: Insert lessons for Comercio Justo
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id 
  FROM marketplace_modules 
  WHERE slug = 'comercio-justo-cadenas-valor' AND is_platform_module = TRUE;

  IF v_module_id IS NOT NULL THEN
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points) VALUES
    (v_module_id, 1, 'Principios de Comercio Justo', 'Fundamentos y certificaciones de comercio justo.', 45, 200, ARRAY['Comercio justo', 'Principios', 'Certificaciones']),
    (v_module_id, 2, 'Mapeo de Cadena de Suministro', 'Análisis y mapeo de cadenas de valor.', 60, 250, ARRAY['Cadena de suministro', 'Mapeo', 'Análisis']),
    (v_module_id, 3, 'Sourcing Local y Sostenible', 'Estrategias de aprovisionamiento local responsable.', 60, 250, ARRAY['Sourcing local', 'Sostenibilidad', 'Responsabilidad']),
    (v_module_id, 4, 'Salarios y Condiciones Dignas', 'Cálculo de salarios justos y condiciones laborales.', 45, 200, ARRAY['Salarios justos', 'Condiciones', 'Dignidad']),
    (v_module_id, 5, 'Plan de Compras Responsables', 'Desarrollo de política de adquisiciones responsables.', 75, 300, ARRAY['Compras responsables', 'Política', 'Implementación']);
    
    RAISE NOTICE '✅ Inserted 5 lessons for Comercio Justo (module: %)', v_module_id;
  ELSE
    RAISE WARNING '❌ Module comercio-justo-cadenas-valor not found';
  END IF;
END $$;

-- Step 8: Update lesson counts
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

-- Step 9: Verify
DO $$
DECLARE
  v_total_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_lessons FROM module_lessons;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LESSONS FORCE INSERTED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total lessons in database: %', v_total_lessons;
  RAISE NOTICE '';
END $$;

