-- =====================================================
-- URGENT FIX SCRIPT
-- Run this in Supabase SQL Editor to fix all issues
-- =====================================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Then click RUN (or press Cmd/Ctrl + Enter)
-- =====================================================

-- PART 1: Ensure promo_codes table exists
-- =====================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code Details
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount Type & Amount
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free')),
  discount_value NUMERIC(10, 2) NOT NULL,
  
  -- Usage Limits
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Date Restrictions
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  
  -- Module Restrictions
  applicable_modules UUID[],
  applicable_purchase_types TEXT[],
  
  -- Minimum Purchase
  minimum_purchase_amount NUMERIC(10, 2) DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Creator & Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Partner/Campaign Tracking
  partner_name TEXT,
  campaign_name TEXT,
  notes TEXT
);

-- Promo code uses tracking
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  cart_total_before_discount NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  cart_total_after_discount NUMERIC(10, 2) NOT NULL,
  modules_purchased JSONB,
  used_at TIMESTAMP DEFAULT NOW(),
  stripe_session_id TEXT,
  user_ip TEXT,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);

-- Permissions
GRANT SELECT ON promo_codes TO authenticated;
GRANT ALL ON promo_code_uses TO authenticated;

-- Sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, partner_name, campaign_name)
VALUES 
  ('LAUNCH100', 'Launch Week - 100% off for strategic partners', 'free', 100, 'Strategic Partners', 'Platform Launch 2025'),
  ('PARTNER50', '50% off for partner organizations', 'percentage', 50, 'Partner Network', 'Partner Program'),
  ('WELCOME25', 'Welcome discount for new users', 'percentage', 25, NULL, 'Welcome Campaign')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PART 2: Ensure modules exist and are published
-- =====================================================

-- First, ensure is_platform_module column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'marketplace_modules' 
        AND column_name = 'is_platform_module'
    ) THEN
        ALTER TABLE marketplace_modules ADD COLUMN is_platform_module BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Module 1: Aire Limpio
DO $$
DECLARE
  v_module_id UUID;
  v_existing_module UUID;
BEGIN
  -- Check if module already exists
  SELECT id INTO v_existing_module 
  FROM marketplace_modules 
  WHERE slug LIKE 'aire-limpio-el-despertar-corporativo%' 
  LIMIT 1;
  
  IF v_existing_module IS NULL THEN
    -- Insert new module
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      'Aire Limpio: El Despertar Corporativo',
      'Descubre cómo tu empresa puede mejorar la calidad del aire, reducir emisiones y crear un impacto positivo en la salud de empleados y comunidades.',
      'aire-limpio-el-despertar-corporativo',
      'Crowd Conscious Platform',
      'clean_air', 'beginner', 8, 200,
      18000, 8000, 360,
      'published', TRUE, TRUE, 5, NOW()
    ) RETURNING id INTO v_module_id;

    -- Insert lessons
    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points) VALUES
    (v_module_id, 1, 'El Impacto Invisible', 'Comprende qué es la calidad del aire y por qué importa', 45, 40, 
     ARRAY['Identificar contaminantes comunes del aire', 'Comprender los estándares de la OMS', 'Reconocer el impacto en la salud y productividad'],
     ARRAY['PM2.5 es el contaminante más peligroso', 'Aire malo reduce productividad en 10%', 'Ciudad de México: 25-30 µg/m³ promedio']),
    
    (v_module_id, 2, 'Identificando Fuentes de Emisión', 'Mapea las fuentes de contaminación en tu organización', 60, 50,
     ARRAY['Identificar emisiones Scope 1', 'Identificar emisiones Scope 2', 'Crear un inventario de emisiones'],
     ARRAY['Transporte es la mayor fuente de emisiones', 'Red eléctrica de México es 75% fósil', 'Reducción del 20-30% es alcanzable']),
    
    (v_module_id, 3, 'Calculando el ROI de Aire Limpio', 'Justifica la inversión con números', 45, 40,
     ARRAY['Calcular ahorros por reducción de ausentismo', 'Estimar ahorros en energía', 'Proyectar ROI a 3 años'],
     ARRAY['Aire limpio reduce ausentismo en 15-25%', 'Ahorro energético del 10-40% es posible', 'ROI típico: 18-36 meses']),
    
    (v_module_id, 4, 'Plan de Acción 90 Días', 'Crea tu plan de implementación', 60, 50,
     ARRAY['Diseñar un plan de 90 días', 'Establecer KPIs medibles', 'Asignar responsabilidades'],
     ARRAY['Quick wins primero, proyectos grandes después', 'Medir progreso mensualmente', 'Comunicar resultados internamente']),
    
    (v_module_id, 5, 'Reflexión y Compromiso', 'Reflexiona sobre lo aprendido y comprométete a la acción', 30, 20,
     ARRAY['Reflexionar sobre aprendizajes clave', 'Comprometerse con acciones específicas', 'Compartir compromiso con tu equipo'],
     ARRAY['El primer paso es el más importante', 'La consistencia importa más que la perfección', 'Cada acción, por pequeña que sea, cuenta']);

    RAISE NOTICE '✅ Module 1: Aire Limpio created with ID: %', v_module_id;
  ELSE
    -- Update existing module to published
    UPDATE marketplace_modules 
    SET status = 'published', is_platform_module = TRUE, featured = TRUE, published_at = NOW()
    WHERE id = v_existing_module;
    RAISE NOTICE '✅ Module 1: Aire Limpio updated (ID: %)', v_existing_module;
  END IF;
END $$;

-- Module 2: Estrategias Avanzadas
DO $$
DECLARE
  v_module_id UUID;
  v_existing_module UUID;
BEGIN
  SELECT id INTO v_existing_module 
  FROM marketplace_modules 
  WHERE slug LIKE 'estrategias-avanzadas-calidad-aire%' 
  LIMIT 1;
  
  IF v_existing_module IS NULL THEN
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      'Estrategias Avanzadas de Calidad del Aire',
      'Aprende a medir, analizar y mejorar la calidad del aire en espacios de trabajo con herramientas prácticas y casos de éxito.',
      'estrategias-avanzadas-calidad-aire',
      'Crowd Conscious Platform',
      'clean_air', 'intermediate', 8, 250,
      18000, 8000, 360,
      'published', TRUE, TRUE, 5, NOW()
    ) RETURNING id INTO v_module_id;

    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points) VALUES
    (v_module_id, 1, 'Monitoreo Avanzado de Aire', 'Sistemas de monitoreo en tiempo real', 60, 50, 
     ARRAY['Seleccionar equipos de monitoreo', 'Interpretar datos en tiempo real', 'Establecer sistemas de alertas'],
     ARRAY['Sensores IoT monitorean 24/7', 'Datos en tiempo real permiten decisiones rápidas', 'ROI de monitoreo: 12-18 meses']),
    
    (v_module_id, 2, 'Optimización de Sistemas HVAC', 'Mejora la ventilación y filtración', 60, 50,
     ARRAY['Auditar sistemas HVAC existentes', 'Implementar filtros HEPA', 'Optimizar flujos de aire'],
     ARRAY['HVAC representa 40-60% del consumo energético', 'Filtros HEPA eliminan 99.97% de partículas', 'Mejor ventilación reduce contagios en 50%']),
    
    (v_module_id, 3, 'Transición a Flota Verde', 'Electrifica tu flota vehicular', 60, 55,
     ARRAY['Evaluar opciones de vehículos eléctricos', 'Calcular ROI de electrificación', 'Planificar infraestructura de carga'],
     ARRAY['Vehículos eléctricos: 100% menos emisiones directas', 'Costo por km es 60% menor', 'Incentivos gubernamentales cubren hasta 30%']),
    
    (v_module_id, 4, 'Certificaciones y Reporteo', 'Obtén certificaciones internacionales', 45, 40,
     ARRAY['Conocer certificaciones disponibles', 'Preparar reportes de emisiones', 'Comunicar logros efectivamente'],
     ARRAY['ISO 14001 mejora reputación corporativa', 'GRI y CDP son estándares globales', 'Transparencia genera confianza con stakeholders']),
    
    (v_module_id, 5, 'Plan Maestro de Calidad de Aire', 'Estrategia de 3 años', 75, 55,
     ARRAY['Crear roadmap de 3 años', 'Establecer metas ambiciosas pero alcanzables', 'Asegurar buy-in ejecutivo'],
     ARRAY['Visión a largo plazo aumenta compromiso', 'Inversión gradual facilita presupuesto', 'Comunicación constante mantiene momentum']);

    RAISE NOTICE '✅ Module 2: Estrategias Avanzadas created with ID: %', v_module_id;
  ELSE
    UPDATE marketplace_modules 
    SET status = 'published', is_platform_module = TRUE, featured = TRUE, published_at = NOW()
    WHERE id = v_existing_module;
    RAISE NOTICE '✅ Module 2: Estrategias Avanzadas updated (ID: %)', v_existing_module;
  END IF;
END $$;

-- Module 3: Gestión del Agua
DO $$
DECLARE
  v_module_id UUID;
  v_existing_module UUID;
BEGIN
  SELECT id INTO v_existing_module 
  FROM marketplace_modules 
  WHERE slug LIKE 'gestion-sostenible-agua%' 
  LIMIT 1;
  
  IF v_existing_module IS NULL THEN
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      'Gestión Sostenible del Agua',
      'De la escasez a la abundancia: técnicas probadas para reducir el consumo de agua en un 40%.',
      'gestion-sostenible-agua',
      'Crowd Conscious Platform',
      'clean_water', 'beginner', 6, 200,
      18000, 8000, 360,
      'published', TRUE, TRUE, 5, NOW()
    ) RETURNING id INTO v_module_id;

    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points) VALUES
    (v_module_id, 1, 'El Agua en tu Empresa', 'Comprende el uso e impacto del agua', 45, 40,
     ARRAY['Identificar puntos de consumo de agua', 'Comprender costos totales del agua', 'Reconocer riesgos de escasez'],
     ARRAY['Agua representa 2-8% de costos operativos', 'México: 70% del territorio en estrés hídrico', 'Reducción del 30-50% es realista']),
    
    (v_module_id, 2, 'Cálculo de Huella Hídrica', 'Mide tu consumo total de agua', 60, 50,
     ARRAY['Calcular huella hídrica azul', 'Estimar huella hídrica gris', 'Identificar oportunidades de reducción'],
     ARRAY['Huella hídrica incluye agua directa e indirecta', '1 kg de carne = 15,000 litros de agua', 'Manufactura: 10-100 litros por unidad producida']),
    
    (v_module_id, 3, 'Estrategias de Ahorro', 'Reduce el consumo de agua', 60, 50,
     ARRAY['Identificar fugas y desperdicios', 'Implementar sistemas de reciclaje', 'Optimizar procesos industriales'],
     ARRAY['Auditoría de agua detecta 20-40% de ahorros', 'Reciclaje de agua: ROI de 2-4 años', 'Tecnologías de bajo flujo reducen 30-50%']),
    
    (v_module_id, 4, 'Calidad y Tratamiento', 'Gestiona la calidad del agua', 45, 40,
     ARRAY['Comprender estándares de calidad', 'Conocer opciones de tratamiento', 'Cumplir con regulaciones'],
     ARRAY['NOM-001-SEMARNAT regula descargas', 'Tratamiento in-situ ahorra 40% en costos', 'Agua tratada puede reutilizarse para riego']),
    
    (v_module_id, 5, 'Plan de Gestión Hídrica', 'Crea tu estrategia integral de agua', 60, 50,
     ARRAY['Diseñar plan de gestión hídrica', 'Establecer metas de reducción', 'Implementar sistema de monitoreo'],
     ARRAY['Metas SMART aumentan éxito en 70%', 'Monitoreo en tiempo real permite acción rápida', 'Comunicación transparente genera buy-in']);

    RAISE NOTICE '✅ Module 3: Gestión del Agua created with ID: %', v_module_id;
  ELSE
    UPDATE marketplace_modules 
    SET status = 'published', is_platform_module = TRUE, featured = TRUE, published_at = NOW()
    WHERE id = v_existing_module;
    RAISE NOTICE '✅ Module 3: Gestión del Agua updated (ID: %)', v_existing_module;
  END IF;
END $$;

-- Module 4: Economía Circular
DO $$
DECLARE
  v_module_id UUID;
  v_existing_module UUID;
BEGIN
  SELECT id INTO v_existing_module 
  FROM marketplace_modules 
  WHERE slug LIKE 'economia-circular-cero-residuos%' 
  LIMIT 1;
  
  IF v_existing_module IS NULL THEN
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      'Economía Circular: Cero Residuos',
      'Transforma residuos en recursos. Estrategias de economía circular que reducen costos y generan ingresos.',
      'economia-circular-cero-residuos',
      'Crowd Conscious Platform',
      'zero_waste', 'intermediate', 10, 250,
      18000, 8000, 360,
      'published', TRUE, TRUE, 6, NOW()
    ) RETURNING id INTO v_module_id;

    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points) VALUES
    (v_module_id, 1, 'De Lineal a Circular', 'Comprende los principios de economía circular', 45, 40,
     ARRAY['Diferenciar modelo lineal de circular', 'Identificar oportunidades circulares', 'Comprender el valor de los residuos'],
     ARRAY['Economía lineal: extraer-producir-desechar', 'Economía circular: reducir-reutilizar-reciclar', 'Los residuos son materia prima en el lugar equivocado']),
    
    (v_module_id, 2, 'Auditoría de Residuos', 'Identifica y clasifica tus residuos', 60, 50,
     ARRAY['Realizar auditoría de residuos', 'Clasificar tipos de residuos', 'Calcular costos de disposición'],
     ARRAY['30-50% de residuos corporativos son reciclables', 'Costo promedio: $800-2,000 MXN/tonelada', 'Orgánicos representan 40-50% del total']),
    
    (v_module_id, 3, 'Las 5 R\'s en Acción', 'Rechazar, Reducir, Reutilizar, Reciclar, Regenerar', 60, 50,
     ARRAY['Aplicar la jerarquía de las 5 R\'s', 'Diseñar estrategias de reducción', 'Identificar oportunidades de reutilización'],
     ARRAY['Reducir es 10x más efectivo que reciclar', 'Reutilizar ahorra 60-80% en costos', 'Compostaje reduce 90% de orgánicos']),
    
    (v_module_id, 4, 'Reciclaje y Valorización', 'Convierte residuos en recursos vendibles', 60, 50,
     ARRAY['Establecer programas de reciclaje', 'Identificar mercados para materiales', 'Calcular ingresos potenciales'],
     ARRAY['Cartón: $1,500-2,500 MXN/tonelada', 'PET: $3,000-5,000 MXN/tonelada', 'Metales: $2,000-4,000 MXN/tonelada']),
    
    (v_module_id, 5, 'Compostaje Corporativo', 'Transforma orgánicos en composta valiosa', 45, 40,
     ARRAY['Comprender el proceso de compostaje', 'Diseñar sistema de compostaje', 'Calcular beneficios ambientales'],
     ARRAY['Compostaje reduce 40-50% del total de residuos', 'Composta vale $500-1,500 MXN/tonelada', 'ROI de compostaje: 12-24 meses']),
    
    (v_module_id, 6, 'Plan de Cero Residuos', 'Diseña tu estrategia integral', 75, 55,
     ARRAY['Establecer meta de cero residuos', 'Diseñar plan de implementación', 'Definir KPIs y métricas'],
     ARRAY['Meta realista: 90% de desvío de relleno sanitario', 'Implementación por fases aumenta éxito en 80%', 'Certificación cero residuos mejora reputación']);

    RAISE NOTICE '✅ Module 4: Economía Circular created with ID: %', v_module_id;
  ELSE
    UPDATE marketplace_modules 
    SET status = 'published', is_platform_module = TRUE, featured = TRUE, published_at = NOW()
    WHERE id = v_existing_module;
    RAISE NOTICE '✅ Module 4: Economía Circular updated (ID: %)', v_existing_module;
  END IF;
END $$;

-- Module 5: Ciudades Seguras
DO $$
DECLARE
  v_module_id UUID;
  v_existing_module UUID;
BEGIN
  SELECT id INTO v_existing_module 
  FROM marketplace_modules 
  WHERE slug LIKE 'ciudades-seguras-espacios-inclusivos%' 
  LIMIT 1;
  
  IF v_existing_module IS NULL THEN
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      'Ciudades Seguras y Espacios Inclusivos',
      'Crea entornos urbanos seguros, accesibles e inclusivos que beneficien a empleados y comunidades.',
      'ciudades-seguras-espacios-inclusivos',
      'Crowd Conscious Platform',
      'safe_cities', 'beginner', 6, 200,
      18000, 8000, 360,
      'published', TRUE, TRUE, 5, NOW()
    ) RETURNING id INTO v_module_id;

    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points) VALUES
    (v_module_id, 1, 'Principios de Seguridad Urbana', 'Comprende qué hace que un espacio sea seguro', 45, 40,
     ARRAY['Identificar factores de seguridad', 'Comprender percepción vs realidad', 'Reconocer necesidades diversas'],
     ARRAY['Iluminación adecuada reduce criminalidad 30-40%', 'Percepción de seguridad afecta uso del espacio', 'Mujeres y niños tienen necesidades específicas']),
    
    (v_module_id, 2, 'Mapeo de Seguridad', 'Identifica puntos críticos y oportunidades', 60, 50,
     ARRAY['Realizar auditoría de seguridad', 'Involucrar a la comunidad', 'Priorizar intervenciones'],
     ARRAY['Mapeo comunitario identifica puntos ciegos', 'Colaboración con vecinos es clave', 'Inversión en prevención es 4x más efectiva']),
    
    (v_module_id, 3, 'Diseño de Espacios Seguros', 'Aplica principios de diseño urbano', 60, 50,
     ARRAY['Aplicar CPTED (Crime Prevention Through Environmental Design)', 'Mejorar visibilidad y acceso', 'Crear espacios de convivencia'],
     ARRAY['Espacios naturalmente vigilados son más seguros', 'Mantenimiento regular previene deterioro', 'Espacios activos desincentivan criminalidad']),
    
    (v_module_id, 4, 'Movilidad Segura', 'Rutas seguras para peatones y ciclistas', 45, 40,
     ARRAY['Analizar rutas de acceso', 'Identificar barreras de movilidad', 'Proponer mejoras de infraestructura'],
     ARRAY['70% de empleados usan transporte público', 'Rutas seguras aumentan uso de transporte activo', 'Mejores banquetas reducen accidentes 50%']),
    
    (v_module_id, 5, 'Plan de Seguridad Comunitaria', 'Implementa mejoras colaborativas', 60, 50,
     ARRAY['Diseñar plan de seguridad', 'Establecer alianzas comunidad-empresa', 'Implementar programa de monitoreo'],
     ARRAY['Colaboración público-privada multiplica impacto', 'Comunicación constante mantiene compromiso', 'Mejoras graduales generan momentum']);

    RAISE NOTICE '✅ Module 5: Ciudades Seguras created with ID: %', v_module_id;
  ELSE
    UPDATE marketplace_modules 
    SET status = 'published', is_platform_module = TRUE, featured = TRUE, published_at = NOW()
    WHERE id = v_existing_module;
    RAISE NOTICE '✅ Module 5: Ciudades Seguras updated (ID: %)', v_existing_module;
  END IF;
END $$;

-- Module 6: Comercio Justo
DO $$
DECLARE
  v_module_id UUID;
  v_existing_module UUID;
BEGIN
  SELECT id INTO v_existing_module 
  FROM marketplace_modules 
  WHERE slug LIKE 'comercio-justo-cadenas-valor%' 
  LIMIT 1;
  
  IF v_existing_module IS NULL THEN
    INSERT INTO marketplace_modules (
      title, description, slug, creator_name,
      core_value, difficulty_level, estimated_duration_hours, xp_reward,
      base_price_mxn, price_per_50_employees, individual_price_mxn,
      status, is_platform_module, featured, lesson_count, published_at
    ) VALUES (
      'Comercio Justo y Cadenas de Valor',
      'Construye cadenas de suministro éticas que beneficien a todos los participantes y fortalezcan economías locales.',
      'comercio-justo-cadenas-valor',
      'Crowd Conscious Platform',
      'fair_trade', 'intermediate', 8, 250,
      18000, 8000, 360,
      'published', TRUE, TRUE, 5, NOW()
    ) RETURNING id INTO v_module_id;

    INSERT INTO module_lessons (module_id, lesson_order, title, description, estimated_minutes, xp_reward, learning_objectives, key_points) VALUES
    (v_module_id, 1, 'Principios de Comercio Justo', 'Comprende qué es el comercio justo', 45, 40,
     ARRAY['Definir comercio justo', 'Identificar beneficios', 'Reconocer certificaciones'],
     ARRAY['Comercio justo garantiza precios justos', 'Fortalece comunidades productoras', 'Certificaciones Fairtrade y similares']),
    
    (v_module_id, 2, 'Mapeo de Cadena de Suministro', 'Visualiza tu cadena de valor completa', 60, 50,
     ARRAY['Mapear proveedores directos', 'Identificar proveedores indirectos', 'Detectar riesgos sociales y ambientales'],
     ARRAY['80% del impacto está en la cadena de suministro', 'Transparencia genera confianza', 'Mapeo identifica oportunidades de mejora']),
    
    (v_module_id, 3, 'Sourcing Local', 'Beneficios de comprar localmente', 60, 50,
     ARRAY['Identificar proveedores locales', 'Calcular multiplicador económico', 'Reducir huella de transporte'],
     ARRAY['Cada peso local genera $1.50-2 en economía', 'Sourcing local reduce emisiones 40-60%', 'Proveedores locales son más ágiles']),
    
    (v_module_id, 4, 'Salarios y Condiciones Dignas', 'Asegura trabajo decente en tu cadena', 45, 40,
     ARRAY['Comprender concepto de salario digno', 'Auditar condiciones laborales', 'Implementar mejoras'],
     ARRAY['Salario digno cubre necesidades básicas + 50%', 'México: brecha del 40% entre mínimo y digno', 'Mejores condiciones aumentan productividad 20%']),
    
    (v_module_id, 5, 'Plan de Compras Responsables', 'Política de adquisiciones sostenibles', 75, 55,
     ARRAY['Diseñar política de compras', 'Establecer criterios de selección', 'Implementar sistema de evaluación'],
     ARRAY['Política clara facilita decisiones', 'Criterios balancean precio, calidad, impacto', 'Evaluación continua mejora resultados']);

    RAISE NOTICE '✅ Module 6: Comercio Justo created with ID: %', v_module_id;
  ELSE
    UPDATE marketplace_modules 
    SET status = 'published', is_platform_module = TRUE, featured = TRUE, published_at = NOW()
    WHERE id = v_existing_module;
    RAISE NOTICE '✅ Module 6: Comercio Justo updated (ID: %)', v_existing_module;
  END IF;
END $$;

-- =====================================================
-- PART 3: Verify everything works
-- =====================================================

-- Check promo codes
SELECT 
  '✅ PROMO CODES' as check_name,
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE active = TRUE) as active_codes
FROM promo_codes;

-- Check modules
SELECT 
  '✅ MODULES' as check_name,
  COUNT(*) as total_modules,
  COUNT(*) FILTER (WHERE status = 'published') as published_modules,
  COUNT(*) FILTER (WHERE is_platform_module = TRUE) as platform_modules
FROM marketplace_modules;

-- List all platform modules
SELECT 
  title,
  core_value,
  difficulty_level,
  lesson_count as lessons,
  base_price_mxn as price,
  status
FROM marketplace_modules
WHERE is_platform_module = TRUE
ORDER BY created_at;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Promo codes table created and seeded';
  RAISE NOTICE '✅ 6 platform modules created/updated';
  RAISE NOTICE '✅ All modules published and ready';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Test promo code creation in admin panel';
  RAISE NOTICE '2. Visit marketplace to see all 6 modules';
  RAISE NOTICE '3. Try enrolling in a module';
  RAISE NOTICE '';
END $$;

