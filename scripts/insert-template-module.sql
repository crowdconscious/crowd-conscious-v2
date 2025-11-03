-- Insert Template Module: "Guía: Cómo Crear un Módulo de Capacitación Efectivo"
-- This is an educational template for community creators

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Insert the template module
  INSERT INTO marketplace_modules (
    title, description, slug, creator_community_id, creator_user_id, creator_name,
    core_value, difficulty_level, estimated_duration_hours, xp_reward,
    base_price_mxn, price_per_50_employees, status, is_platform_module,
    is_template, featured, lesson_count, published_at
  ) VALUES (
    'Guía: Cómo Crear un Módulo de Capacitación Efectivo',
    'Aprende a crear módulos de capacitación impactantes que transformen empresas. Esta guía paso a paso te muestra la estructura, mejores prácticas y ejemplos reales de módulos exitosos.',
    'guia-crear-modulo-efectivo-template',
    NULL, -- No community (platform template)
    NULL, -- No user (platform template)
    'Crowd Conscious Platform',
    'biodiversity',
    'beginner',
    2,
    500,
    0, -- Free template
    0, -- Free template
    'published',
    TRUE, -- Platform module
    TRUE, -- Template module
    FALSE, -- Not featured (templates have separate section)
    4,
    NOW()
  ) RETURNING id INTO v_module_id;

  RAISE NOTICE 'Template module created: %', v_module_id;

  -- Insert Lesson 1
  INSERT INTO module_lessons (
    module_id, lesson_order, title, description, estimated_minutes, xp_reward,
    learning_objectives, key_points, did_you_know, real_world_example,
    activity_type, activity_required, tools_used, resources, next_steps
  ) VALUES (
    v_module_id, 1,
    'Introducción: Anatomía de un Módulo Exitoso',
    'Descubre los elementos clave que hacen que un módulo de capacitación sea efectivo y transformador.',
    20, 100,
    ARRAY[
      'Comprender la estructura de un módulo efectivo',
      'Identificar los componentes esenciales',
      'Conocer las mejores prácticas de diseño instruccional'
    ],
    ARRAY[
      'Un módulo efectivo cuenta una historia',
      'Combina teoría con práctica',
      'Incluye herramientas interactivas',
      'Mide resultados concretos'
    ],
    ARRAY[
      'Los módulos con narrativa tienen 65% más engagement',
      'Las herramientas interactivas aumentan la retención en 40%',
      'Los ejemplos reales mejoran la aplicación práctica en 80%'
    ],
    'El módulo "Aire Limpio: El Despertar Corporativo" logró que 85% de las empresas implementaran cambios en los primeros 30 días gracias a su estructura narrativa y herramientas prácticas.',
    'reflection', FALSE,
    ARRAY['reflection_journal'],
    '[{"type":"article","title":"Principios de Diseño Instruccional","url":"#"},{"type":"tool","title":"Diario de Reflexión","url":"tool:reflection_journal"}]'::jsonb,
    ARRAY[
      'Reflexiona sobre tu experiencia comunitaria',
      'Identifica el problema que quieres resolver',
      'Piensa en tu audiencia objetivo'
    ]
  );

  -- Insert Lesson 2
  INSERT INTO module_lessons (
    module_id, lesson_order, title, description, estimated_minutes, xp_reward,
    learning_objectives, key_points, did_you_know, real_world_example,
    activity_type, activity_required, tools_used, resources, next_steps
  ) VALUES (
    v_module_id, 2,
    'Paso 1: Define tu Propuesta de Valor',
    'Aprende a identificar y articular el valor único que tu módulo ofrece a las empresas.',
    30, 150,
    ARRAY[
      'Identificar el problema específico que resuelves',
      'Articular tu propuesta de valor única',
      'Definir tu audiencia objetivo',
      'Establecer objetivos de aprendizaje claros'
    ],
    ARRAY[
      'Problema Específico: ¿Qué dolor resuelves?',
      'Solución Única: ¿Por qué tu comunidad es experta?',
      'Audiencia Clara: ¿Quién necesita esto?',
      'Resultados Medibles: ¿Qué cambio lograrás?'
    ],
    ARRAY[
      'Los módulos con propuestas de valor claras tienen 3x más ventas',
      'Las empresas buscan soluciones a problemas específicos, no teoría general',
      'Tu experiencia comunitaria es tu mayor ventaja competitiva'
    ],
    'La comunidad "EcoCircular Guadalajara" transformó su experiencia en gestión de residuos en un módulo que ayudó a 50 empresas a reducir costos en 30% mientras mejoraban su impacto ambiental.',
    'assessment', TRUE,
    ARRAY['air_quality_assessment'],
    '[{"type":"template","title":"Canvas de Propuesta de Valor","url":"#"},{"type":"tool","title":"Evaluación de Necesidades","url":"tool:air_quality_assessment"}]'::jsonb,
    ARRAY[
      'Completa el canvas de propuesta de valor',
      'Valida tu idea con 3 empresas potenciales',
      'Refina tu mensaje basado en feedback'
    ]
  );

  -- Insert Lesson 3
  INSERT INTO module_lessons (
    module_id, lesson_order, title, description, estimated_minutes, xp_reward,
    learning_objectives, key_points, did_you_know, real_world_example,
    activity_type, activity_required, tools_used, resources, next_steps
  ) VALUES (
    v_module_id, 3,
    'Paso 2: Estructura tu Contenido con Narrativa',
    'Descubre cómo organizar tu contenido en una narrativa convincente que mantenga el engagement.',
    40, 150,
    ARRAY[
      'Estructurar lecciones con narrativa',
      'Crear ganchos emocionales',
      'Balancear teoría y práctica',
      'Diseñar actividades interactivas'
    ],
    ARRAY[
      'Estructura de 3 Actos: Problema → Solución → Transformación',
      'Gancho Emocional: Conecta con experiencias reales',
      'Regla 70/30: 70% práctica, 30% teoría',
      'Herramientas Interactivas: Calculadoras, evaluaciones, planes'
    ],
    ARRAY[
      'Los módulos narrativos tienen 2x mejor tasa de completación',
      'Las historias reales aumentan la credibilidad en 90%',
      'Las actividades prácticas mejoran la aplicación en 75%'
    ],
    'El módulo "Gestión Sostenible del Agua" usa la historia de una empresa que redujo su consumo en 40% como hilo conductor, haciendo que cada lección sea un capítulo de esa transformación.',
    'planning', TRUE,
    ARRAY['implementation_plan'],
    '[{"type":"template","title":"Plantilla de Estructura de Módulo","url":"#"},{"type":"tool","title":"Plan de Implementación","url":"tool:implementation_plan"},{"type":"example","title":"Ejemplo: Módulo Aire Limpio","url":"/marketplace/63c08c28-638d-42d9-ba5d-ecfc541957b0"}]'::jsonb,
    ARRAY[
      'Crea el outline de tus 5-8 lecciones',
      'Identifica tu historia central',
      'Selecciona herramientas para cada lección'
    ]
  );

  -- Insert Lesson 4
  INSERT INTO module_lessons (
    module_id, lesson_order, title, description, estimated_minutes, xp_reward,
    learning_objectives, key_points, did_you_know, real_world_example,
    activity_type, activity_required, tools_used, resources, next_steps
  ) VALUES (
    v_module_id, 4,
    'Paso 3: Lanza y Mejora Continuamente',
    'Aprende a lanzar tu módulo, recopilar feedback y mejorar basado en resultados reales.',
    30, 100,
    ARRAY[
      'Preparar tu módulo para lanzamiento',
      'Establecer métricas de éxito',
      'Recopilar y analizar feedback',
      'Iterar basado en datos'
    ],
    ARRAY[
      'Checklist de Lanzamiento: Título, descripción, precio, thumbnail',
      'Métricas Clave: Tasa de completación, satisfacción, impacto',
      'Feedback Loop: Encuestas, testimonios, casos de éxito',
      'Mejora Continua: Actualiza contenido cada 6 meses'
    ],
    ARRAY[
      'Los módulos que se actualizan regularmente tienen 50% más ventas',
      'El feedback de los primeros 10 clientes es oro puro',
      'Los testimoniales aumentan las conversiones en 60%'
    ],
    'La comunidad "Barrio Seguro Monterrey" lanzó su módulo en versión beta con 5 empresas, recopiló feedback intensivo, y la versión 2.0 tuvo 10x más ventas gracias a las mejoras implementadas.',
    'submission', TRUE,
    ARRAY['evidence_uploader'],
    '[{"type":"checklist","title":"Checklist de Lanzamiento","url":"#"},{"type":"tool","title":"Subidor de Evidencia","url":"tool:evidence_uploader"},{"type":"guide","title":"Guía de Precios","url":"#"}]'::jsonb,
    ARRAY[
      'Completa el checklist de lanzamiento',
      'Envía tu módulo para revisión',
      'Prepara tu estrategia de marketing',
      'Identifica tus primeros 5 clientes potenciales'
    ]
  );

  RAISE NOTICE 'Template module lessons created successfully';

  -- Verify the template module
  SELECT 
    id,
    title,
    is_template,
    is_platform_module,
    status,
    lesson_count
  FROM marketplace_modules
  WHERE is_template = TRUE;

END $$;

