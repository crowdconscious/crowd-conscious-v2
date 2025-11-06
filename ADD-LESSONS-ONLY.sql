-- ========================================================================
-- ADD LESSONS TO PREMIUM MODULES
-- ========================================================================
-- This script only adds lessons - doesn't modify existing tables
-- ========================================================================

-- Module 1: Aire Limpio: El Despertar Corporativo
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM marketplace_modules 
  WHERE slug = 'aire-limpio-despertar-corporativo' LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    DELETE FROM module_lessons WHERE module_id = v_module_id;
    
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points)
    VALUES
      (v_module_id, 1, 'El Impacto Invisible', 'Descubre cómo la calidad del aire afecta la productividad y salud de tu equipo', 45, 40, ARRAY['Fundamentos de calidad del aire', 'Impactos en la salud y productividad', 'Métricas clave']),
      (v_module_id, 2, 'Identificando Fuentes de Emisión', 'Aprende a mapear y medir las fuentes de contaminación en tu organización', 60, 50, ARRAY['Mapeo de emisiones', 'Herramientas de medición', 'Análisis de datos']),
      (v_module_id, 3, 'Calculando el ROI', 'Justifica la inversión en calidad del aire con datos concretos', 45, 40, ARRAY['Cálculo de costos', 'Beneficios cuantificables', 'Presentación ejecutiva']),
      (v_module_id, 4, 'Plan de Acción 90 Días', 'Crea tu plan de implementación paso a paso', 60, 50, ARRAY['Planificación estratégica', 'Quick wins', 'Cronograma de implementación']),
      (v_module_id, 5, 'Reflexión y Compromiso', 'Consolida aprendizajes y establece compromisos de acción', 30, 20, ARRAY['Reflexión personal', 'Compromisos concretos', 'Siguiente pasos']);

    RAISE NOTICE 'Added lessons to: %', v_module_id;
  ELSE
    RAISE NOTICE 'Module aire-limpio-despertar-corporativo not found';
  END IF;
END $$;

-- Module 2: Estrategias Avanzadas de Calidad del Aire
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM marketplace_modules 
  WHERE slug = 'estrategias-avanzadas-calidad-aire' LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    DELETE FROM module_lessons WHERE module_id = v_module_id;
    
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points)
    VALUES
      (v_module_id, 1, 'Monitoreo Avanzado', 'Sistemas de monitoreo en tiempo real', 60, 50, ARRAY['Sensores IoT', 'Plataformas de datos', 'Alertas automáticas']),
      (v_module_id, 2, 'Optimización HVAC', 'Mejora de sistemas de ventilación', 60, 50, ARRAY['Diseño de sistemas', 'Mantenimiento preventivo', 'Eficiencia energética']),
      (v_module_id, 3, 'Flota Verde', 'Electrificación y reducción de emisiones', 60, 50, ARRAY['Vehículos eléctricos', 'Infraestructura de carga', 'ROI de electrificación']),
      (v_module_id, 4, 'Certificaciones', 'Procesos de certificación ISO 14001', 45, 40, ARRAY['Estándares internacionales', 'Proceso de certificación', 'Auditorías']),
      (v_module_id, 5, 'Plan Maestro', 'Estrategia de 3 años', 75, 60, ARRAY['Visión a largo plazo', 'Roadmap tecnológico', 'KPIs y seguimiento']);

    RAISE NOTICE 'Added lessons to: %', v_module_id;
  END IF;
END $$;

-- Module 3: Gestión Sostenible del Agua
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM marketplace_modules 
  WHERE slug = 'gestion-sostenible-agua' LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    DELETE FROM module_lessons WHERE module_id = v_module_id;
    
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points)
    VALUES
      (v_module_id, 1, 'El Agua en tu Empresa', 'Análisis del consumo actual de agua', 45, 40, ARRAY['Huella hídrica', 'Mapeo de consumo', 'Oportunidades de ahorro']),
      (v_module_id, 2, 'Huella Hídrica', 'Cálculo detallado de tu huella hídrica', 60, 50, ARRAY['Metodología de cálculo', 'Herramientas digitales', 'Benchmarking']),
      (v_module_id, 3, 'Estrategias de Ahorro', 'Técnicas de conservación del agua', 60, 50, ARRAY['Tecnologías de ahorro', 'Reutilización', 'Cambios operacionales']),
      (v_module_id, 4, 'Calidad y Tratamiento', 'Gestión de calidad del agua', 45, 40, ARRAY['Estándares de calidad', 'Tratamiento de aguas residuales', 'Cumplimiento normativo']),
      (v_module_id, 5, 'Plan Gestión Hídrica', 'Estrategia integral de agua', 60, 50, ARRAY['Plan de acción', 'Inversiones necesarias', 'Monitoreo continuo']);

    RAISE NOTICE 'Added lessons to: %', v_module_id;
  END IF;
END $$;

-- Module 4: Economía Circular: Cero Residuos
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM marketplace_modules 
  WHERE slug = 'economia-circular-cero-residuos' LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    DELETE FROM module_lessons WHERE module_id = v_module_id;
    
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points)
    VALUES
      (v_module_id, 1, 'De Lineal a Circular', 'Principios de economía circular', 45, 40, ARRAY['Modelos económicos', 'Casos de éxito', 'Beneficios financieros']),
      (v_module_id, 2, 'Auditoría de Residuos', 'Mapeo de flujos de residuos', 60, 50, ARRAY['Tipos de residuos', 'Cuantificación', 'Análisis de costos']),
      (v_module_id, 3, 'Las 5 R en Acción', 'Refuse, Reduce, Reuse, Recycle, Regenerate', 60, 50, ARRAY['Jerarquía de residuos', 'Implementación práctica', 'Quick wins']),
      (v_module_id, 4, 'Reciclaje y Valorización', 'Convertir residuos en recursos', 60, 50, ARRAY['Mercados de materiales', 'Reciclaje industrial', 'Upcycling']),
      (v_module_id, 5, 'Compostaje Corporativo', 'Gestión de residuos orgánicos', 45, 40, ARRAY['Sistemas de compostaje', 'Beneficios del compost', 'Implementación']),
      (v_module_id, 6, 'Plan Cero Residuos', 'Estrategia comprehensiva', 75, 60, ARRAY['Objetivos SMART', 'Roadmap de implementación', 'Certificación cero residuos']);

    RAISE NOTICE 'Added lessons to: %', v_module_id;
  END IF;
END $$;

-- Module 5: Ciudades Seguras y Espacios Inclusivos
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM marketplace_modules 
  WHERE slug = 'ciudades-seguras-espacios-inclusivos' LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    DELETE FROM module_lessons WHERE module_id = v_module_id;
    
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points)
    VALUES
      (v_module_id, 1, 'Principios de Seguridad Urbana', 'Fundamentos de espacios seguros', 45, 40, ARRAY['Teorías de seguridad', 'Diseño inclusivo', 'Casos internacionales']),
      (v_module_id, 2, 'Mapeo de Seguridad', 'Identificación de riesgos', 60, 50, ARRAY['Análisis de riesgos', 'Participación comunitaria', 'Herramientas digitales']),
      (v_module_id, 3, 'Diseño de Espacios Seguros', 'CPTED y diseño ambiental', 60, 50, ARRAY['Crime Prevention Through Environmental Design', 'Iluminación', 'Visibilidad']),
      (v_module_id, 4, 'Movilidad Segura', 'Transporte seguro e inclusivo', 45, 40, ARRAY['Infraestructura peatonal', 'Cicloinfraestructura', 'Transporte público']),
      (v_module_id, 5, 'Plan de Seguridad Comunitaria', 'Colaboración público-privada', 60, 50, ARRAY['Alianzas estratégicas', 'Responsabilidad corporativa', 'Impacto medible']);

    RAISE NOTICE 'Added lessons to: %', v_module_id;
  END IF;
END $$;

-- Module 6: Comercio Justo y Cadenas de Valor
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM marketplace_modules 
  WHERE slug = 'comercio-justo-cadenas-valor' LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    DELETE FROM module_lessons WHERE module_id = v_module_id;
    
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, key_points)
    VALUES
      (v_module_id, 1, 'Principios de Comercio Justo', 'Fundamentos y certificaciones', 45, 40, ARRAY['Fair Trade International', 'Beneficios sociales', 'Impacto económico']),
      (v_module_id, 2, 'Mapeo de Cadena de Suministro', 'Trazabilidad y transparencia', 60, 50, ARRAY['Mapeo de proveedores', 'Riesgos en la cadena', 'Herramientas de trazabilidad']),
      (v_module_id, 3, 'Sourcing Local', 'Beneficios de la compra local', 60, 50, ARRAY['Desarrollo económico local', 'Reducción de huella de carbono', 'Relaciones con proveedores']),
      (v_module_id, 4, 'Salarios y Condiciones Dignas', 'Estándares laborales', 45, 40, ARRAY['Living wage', 'Condiciones de trabajo', 'Auditorías laborales']),
      (v_module_id, 5, 'Plan de Compras Responsables', 'Estrategia de adquisiciones', 75, 60, ARRAY['Políticas de compra', 'Evaluación de proveedores', 'Mejora continua']);

    RAISE NOTICE 'Added lessons to: %', v_module_id;
  END IF;
END $$;

-- Update lesson counts
UPDATE marketplace_modules m
SET lesson_count = (
  SELECT COUNT(*) 
  FROM module_lessons l 
  WHERE l.module_id = m.id
)
WHERE EXISTS (
  SELECT 1 FROM module_lessons l WHERE l.module_id = m.id
);

-- Summary
DO $$
DECLARE
  v_lesson_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_lesson_count 
  FROM module_lessons ml
  JOIN marketplace_modules m ON ml.module_id = m.id
  WHERE m.status = 'published' AND m.is_template = false;
  
  RAISE NOTICE '✅ Total lessons added: %', v_lesson_count;
END $$;

