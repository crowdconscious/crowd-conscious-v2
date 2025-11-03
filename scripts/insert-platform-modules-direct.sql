-- Direct SQL insert for platform modules
-- Run this in Supabase SQL Editor

-- Module 1: Aire Limpio (Beginner)
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Insert module
  INSERT INTO marketplace_modules (
    title,
    description,
    slug,
    creator_community_id,
    creator_user_id,
    creator_name,
    core_value,
    difficulty_level,
    estimated_duration_hours,
    xp_reward,
    base_price_mxn,
    price_per_50_employees,
    status,
    is_platform_module,
    featured,
    lesson_count,
    published_at
  ) VALUES (
    'Aire Limpio: El Despertar Corporativo',
    'Descubre cómo tu empresa puede mejorar la calidad del aire, reducir emisiones y crear un impacto positivo en la salud de empleados y comunidades.',
    'aire-limpio-el-despertar-corporativo-' || extract(epoch from now())::bigint,
    NULL,
    NULL,
    'Crowd Conscious Platform',
    'clean_air',
    'beginner',
    8,
    200,
    18000,
    8000,
    'published',
    TRUE,
    TRUE,
    5,
    NOW()
  ) RETURNING id INTO v_module_id;

  -- Insert lessons
  INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points, did_you_know, real_world_example, activity_type, tools_used, resources) VALUES
  (v_module_id, 1, 'El Impacto Invisible', 'Comprende qué es la calidad del aire', 45, 15, 
   ARRAY['Identificar contaminantes', 'Comprender estándares OMS', 'Reconocer impacto en salud'],
   ARRAY['PM2.5 es el más peligroso', 'Reduce productividad 10%', 'México City: 25-30 µg/m³'],
   ARRAY['7M muertes anuales', 'Mejora productividad 11%'],
   'Grupo Bimbo redujo PM2.5 en 38%',
   'assessment', ARRAY['tool:air_quality_assessment'], '[]'::jsonb),
  
  (v_module_id, 2, 'Identificando Fuentes de Emisión', 'Mapea fuentes de contaminación', 60, 20,
   ARRAY['Identificar Scope 1', 'Identificar Scope 2', 'Crear inventario'],
   ARRAY['Transporte es mayor fuente', 'Red eléctrica 75% fósil', 'Reducción 20-30% posible'],
   ARRAY[]::text[], NULL,
   'calculator', ARRAY['tool:carbon_footprint'], '[]'::jsonb),
  
  (v_module_id, 3, 'Calculando el ROI', 'ROI de aire limpio', 45, 15,
   ARRAY['Calcular ahorros ausentismo', 'Estimar ahorros energía', 'Proyectar ROI'],
   ARRAY['Reduce ausentismo 15-25%', 'Ahorro energético 10-40%', 'ROI: 18-36 meses'],
   ARRAY[]::text[], NULL,
   'calculator', ARRAY['tool:air_quality_roi'], '[]'::jsonb),
  
  (v_module_id, 4, 'Plan de Acción 90 Días', 'Crea tu plan', 60, 25,
   ARRAY['Diseñar plan', 'Establecer KPIs', 'Asignar responsabilidades'],
   ARRAY['Quick wins primero', 'Medir mensualmente', 'Comunicar resultados'],
   ARRAY[]::text[], NULL,
   'planning', ARRAY['tool:implementation_plan'], '[]'::jsonb),
  
  (v_module_id, 5, 'Reflexión y Compromiso', 'Reflexiona y comprométete', 30, 15,
   ARRAY['Reflexionar', 'Comprometerse', 'Compartir'],
   ARRAY['Primer paso cuenta', 'Consistencia > perfección', 'Cada acción importa'],
   ARRAY[]::text[], NULL,
   'reflection', ARRAY['tool:reflection_journal'], '[]'::jsonb);

  RAISE NOTICE 'Module 1 created: %', v_module_id;
END $$;

-- Module 2: Estrategias Avanzadas (Intermediate)
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  INSERT INTO marketplace_modules (
    title, description, slug, creator_community_id, creator_user_id, creator_name,
    core_value, difficulty_level, estimated_duration_hours, xp_reward,
    base_price_mxn, price_per_50_employees, status, is_platform_module,
    featured, lesson_count, published_at
  ) VALUES (
    'Estrategias Avanzadas de Calidad del Aire',
    'Aprende a medir, analizar y mejorar la calidad del aire en espacios de trabajo. Incluye herramientas prácticas y casos de éxito.',
    'estrategias-avanzadas-calidad-aire-' || extract(epoch from now())::bigint,
    NULL, NULL, 'Crowd Conscious Platform',
    'clean_air', 'intermediate', 8, 250,
    18000, 8000, 'published', TRUE, TRUE, 5, NOW()
  ) RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points, activity_type, tools_used, resources) VALUES
  (v_module_id, 1, 'Monitoreo Avanzado', 'Sistemas de monitoreo en tiempo real', 60, 20,
   ARRAY['Seleccionar equipos', 'Interpretar datos', 'Establecer alertas'],
   ARRAY['Sensores IoT 24/7', 'Decisiones rápidas', 'ROI 12-18 meses'],
   'assessment', ARRAY['tool:air_quality_assessment'], '[]'::jsonb),
  (v_module_id, 2, 'Optimización HVAC', 'Mejora ventilación', 60, 20,
   ARRAY['Auditar HVAC', 'Implementar HEPA', 'Optimizar flujos'],
   ARRAY['HVAC 40-60% energía', 'HEPA elimina 99.97%', 'Reduce contagios 50%'],
   'calculator', ARRAY['tool:cost_savings'], '[]'::jsonb),
  (v_module_id, 3, 'Flota Verde', 'Electrifica tu flota', 60, 25,
   ARRAY['Evaluar opciones', 'Calcular ROI', 'Planificar infraestructura'],
   ARRAY['100% emisiones cero', '60% menor costo/km', 'Incentivos 30%'],
   'calculator', ARRAY['tool:carbon_footprint', 'tool:air_quality_roi'], '[]'::jsonb),
  (v_module_id, 4, 'Certificaciones', 'Obtén certificaciones', 45, 20,
   ARRAY['Conocer certificaciones', 'Preparar reportes', 'Comunicar logros'],
   ARRAY['ISO 14001 mejora reputación', 'GRI/CDP estándar', 'Transparencia = confianza'],
   'reading', ARRAY[]::text[], '[]'::jsonb),
  (v_module_id, 5, 'Plan Maestro', 'Estrategia 3 años', 75, 30,
   ARRAY['Crear roadmap', 'Establecer metas', 'Asegurar buy-in'],
   ARRAY['Visión largo plazo', 'Inversión gradual', 'Comunicación constante'],
   'planning', ARRAY['tool:implementation_plan', 'tool:reflection_journal'], '[]'::jsonb);

  RAISE NOTICE 'Module 2 created: %', v_module_id;
END $$;

-- Module 3: Gestión Agua (Beginner)
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  INSERT INTO marketplace_modules (
    title, description, slug, creator_community_id, creator_user_id, creator_name,
    core_value, difficulty_level, estimated_duration_hours, xp_reward,
    base_price_mxn, price_per_50_employees, status, is_platform_module,
    featured, lesson_count, published_at
  ) VALUES (
    'Gestión Sostenible del Agua',
    'De la escasez a la abundancia: técnicas probadas para reducir el consumo de agua en un 40%.',
    'gestion-sostenible-agua-' || extract(epoch from now())::bigint,
    NULL, NULL, 'Crowd Conscious Platform',
    'clean_water', 'beginner', 6, 200,
    18000, 8000, 'published', TRUE, TRUE, 5, NOW()
  ) RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points, did_you_know, activity_type, tools_used, resources) VALUES
  (v_module_id, 1, 'El Agua en tu Empresa', 'Uso e impacto del agua', 45, 15,
   ARRAY['Identificar consumo', 'Comprender costos', 'Reconocer riesgos'],
   ARRAY['2-8% costos operativos', '70% estrés hídrico México', 'Reducción 30-50% posible'],
   ARRAY['Fuga 1mm = 30K litros/mes', 'Reciclaje cubre 40-60%'],
   'assessment', ARRAY['tool:reflection_journal'], '[]'::jsonb),
  (v_module_id, 2, 'Huella Hídrica', 'Calcula consumo', 60, 20,
   ARRAY['Calcular huella azul', 'Estimar huella gris', 'Identificar oportunidades'],
   ARRAY['Incluye directa/indirecta', '1kg carne = 15K litros', 'Manufactura 10-100L/unidad'],
   ARRAY[]::text[],
   'calculator', ARRAY['tool:cost_savings'], '[]'::jsonb),
  (v_module_id, 3, 'Estrategias de Ahorro', 'Reduce consumo', 60, 20,
   ARRAY['Identificar fugas', 'Implementar reciclaje', 'Optimizar procesos'],
   ARRAY['Auditoría 20-40% ahorros', 'ROI reciclaje 2-4 años', 'Bajo flujo -30-50%'],
   ARRAY[]::text[],
   'planning', ARRAY['tool:implementation_plan'], '[]'::jsonb),
  (v_module_id, 4, 'Calidad y Tratamiento', 'Gestiona calidad', 45, 15,
   ARRAY['Comprender estándares', 'Conocer tratamiento', 'Cumplir regulaciones'],
   ARRAY['NOM-001-SEMARNAT', 'Tratamiento -40% costos', 'Reutilización riego'],
   ARRAY[]::text[],
   'reading', ARRAY[]::text[], '[]'::jsonb),
  (v_module_id, 5, 'Plan Gestión Hídrica', 'Estrategia integral', 60, 25,
   ARRAY['Diseñar plan', 'Establecer metas', 'Implementar monitoreo'],
   ARRAY['Metas SMART 70% éxito', 'Monitoreo tiempo real', 'Comunicación clave'],
   ARRAY[]::text[],
   'planning', ARRAY['tool:implementation_plan', 'tool:reflection_journal'], '[]'::jsonb);

  RAISE NOTICE 'Module 3 created: %', v_module_id;
END $$;

-- Module 4: Economía Circular (Intermediate)
DO $$
DECLARE
  v_module_id UUID;
BEGIN
  INSERT INTO marketplace_modules (
    title, description, slug, creator_community_id, creator_user_id, creator_name,
    core_value, difficulty_level, estimated_duration_hours, xp_reward,
    base_price_mxn, price_per_50_employees, status, is_platform_module,
    featured, lesson_count, published_at
  ) VALUES (
    'Economía Circular: Cero Residuos',
    'Transforma residuos en recursos. Estrategias de economía circular que reducen costos y generan ingresos.',
    'economia-circular-cero-residuos-' || extract(epoch from now())::bigint,
    NULL, NULL, 'Crowd Conscious Platform',
    'zero_waste', 'intermediate', 10, 250,
    18000, 8000, 'published', TRUE, TRUE, 6, NOW()
  ) RETURNING id INTO v_module_id;

  INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points, did_you_know, activity_type, tools_used, resources) VALUES
  (v_module_id, 1, 'De Lineal a Circular', 'Principios economía circular', 45, 15,
   ARRAY['Diferenciar modelos', 'Identificar oportunidades', 'Comprender valor residuos'],
   ARRAY['Lineal: extraer-producir-desechar', 'Circular: reducir-reutilizar-reciclar', 'Residuos = materia prima'],
   ARRAY['120K ton/día México', '11% reciclaje', '$4.5T USD potencial 2030'],
   'reading', ARRAY[]::text[], '[]'::jsonb),
  (v_module_id, 2, 'Auditoría de Residuos', 'Identifica y clasifica', 60, 20,
   ARRAY['Realizar auditoría', 'Clasificar residuos', 'Calcular costos'],
   ARRAY['30-50% reciclables', '$800-2K MXN/ton disposición', '40-50% orgánicos'],
   ARRAY[]::text[],
   'assessment', ARRAY['tool:reflection_journal'], '[]'::jsonb),
  (v_module_id, 3, 'Las 5 R''s', 'Rechazar, Reducir, Reutilizar, Reciclar, Regenerar', 60, 20,
   ARRAY['Aplicar jerarquía', 'Diseñar estrategias', 'Identificar reutilización'],
   ARRAY['Reducir 10x mejor que reciclar', 'Reutilizar ahorra 60-80%', 'Compostaje -90% orgánicos'],
   ARRAY[]::text[],
   'planning', ARRAY['tool:implementation_plan'], '[]'::jsonb),
  (v_module_id, 4, 'Reciclaje y Valorización', 'Residuos = recursos', 60, 20,
   ARRAY['Establecer programas', 'Identificar mercados', 'Calcular ingresos'],
   ARRAY['Cartón $1.5-2.5K/ton', 'PET $3-5K/ton', 'Metales $2-4K/ton'],
   ARRAY[]::text[],
   'calculator', ARRAY['tool:cost_savings'], '[]'::jsonb),
  (v_module_id, 5, 'Compostaje Corporativo', 'Orgánicos → composta', 45, 15,
   ARRAY['Comprender proceso', 'Diseñar sistema', 'Calcular beneficios'],
   ARRAY['Reduce 40-50% total', 'Composta $500-1.5K/ton', 'ROI 12-24 meses'],
   ARRAY[]::text[],
   'reading', ARRAY[]::text[], '[]'::jsonb),
  (v_module_id, 6, 'Plan Cero Residuos', 'Estrategia integral', 75, 30,
   ARRAY['Establecer meta', 'Diseñar implementación', 'Definir KPIs'],
   ARRAY['Meta 90% desvío', 'Fases aumentan éxito 80%', 'Certificación mejora reputación'],
   ARRAY[]::text[],
   'planning', ARRAY['tool:implementation_plan', 'tool:reflection_journal'], '[]'::jsonb);

  RAISE NOTICE 'Module 4 created: %', v_module_id;
END $$;

-- Verify
SELECT 
  title,
  difficulty_level,
  lesson_count,
  is_platform_module,
  featured,
  status
FROM marketplace_modules
WHERE is_platform_module = TRUE
ORDER BY created_at DESC;

