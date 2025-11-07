-- ================================================================
-- ENRICH MODULE 1: Aire Limpio - LESSONS 2-5
-- Run this in Supabase SQL Editor after checking lesson IDs
-- ================================================================

-- First, let's see what lesson IDs we have
SELECT id, lesson_order, title 
FROM module_lessons 
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY lesson_order;

-- ================================================================
-- LESSON 2: Identificando Fuentes de Emisión
-- ================================================================

UPDATE module_lessons
SET
  title = 'Identificando Fuentes de Emisión',
  description = 'Aprende a identificar y mapear todas las fuentes de emisiones en tu organización para crear un plan de acción efectivo.',
  estimated_minutes = 60,
  xp_reward = 50,
  
  -- STORY CONTENT
  story_content = jsonb_build_object(
    'opening', 'Carlos recorre el piso de la fábrica con María, bloc de notas en mano. "Necesitamos identificar cada fuente de emisiones", explica. María señala la vieja caldera. "Esta cosa tiene 25 años", dice. "Y mira allá—esos camiones de reparto están en ralentí durante horas en el muelle de carga."',
    
    'dialogue', ARRAY[
      'En la cabina de pintura, Carlos nota la falta de ventilación adecuada. El supervisor admite: "Sabemos que no es ideal, pero así hemos trabajado siempre."',
      'María toma fotos de cada área problemática. "Mi primo trabaja en una planta certificada ISO 14001", comenta. "Tienen monitores en todos lados."',
      'Don Roberto, quien trabaja medio tiempo como guardia, los saluda. "¿Saben? Los vecinos se quejan más los lunes por la mañana, cuando arrancan todo de golpe."'
    ],
    
    'resolution_preview', 'Al final del recorrido, Carlos y María han identificado 12 fuentes principales de emisiones. Algunas son fáciles de arreglar, otras requerirán inversión.',
    
    'cliffhanger', 'Carlos muestra a María un diagrama. "Si priorizamos correctamente, podríamos reducir 40% de emisiones en 6 meses sin gastar mucho. Pero necesitamos que el equipo nos ayude a implementar..."'
  ),
  
  -- LEARNING OBJECTIVES
  learning_objectives = ARRAY[
    'Identificar las 3 categorías de emisiones (Alcance 1, 2, 3)',
    'Mapear fuentes de emisión específicas en tu organización',
    'Priorizar acciones según impacto y factibilidad',
    'Crear un inventario básico de emisiones'
  ],
  
  -- KEY POINTS
  key_points = ARRAY[
    'Alcance 1: Emisiones directas (calderas, vehículos propios, procesos industriales)',
    'Alcance 2: Emisiones indirectas de electricidad comprada',
    'Alcance 3: Emisiones en cadena de suministro (85% de huella para muchas empresas)',
    'Priorizar: Alto impacto + Bajo costo = Victoria rápida',
    'Un inventario completo es el primer paso para cualquier certificación ambiental'
  ],
  
  -- DID YOU KNOW
  did_you_know = ARRAY[
    'Walmart redujo 20 millones de toneladas de CO2 al optimizar sus rutas de entrega (Alcance 3)',
    'En México, la electricidad genera 0.527 kg CO2 por kWh (factor de emisión CFE 2023)',
    'El 40% de emisiones industriales provienen de fuentes que las empresas no saben que tienen'
  ],
  
  -- REAL WORLD EXAMPLE
  real_world_example = E'**Grupo Bimbo - Inventario de Emisiones Integral**\n\nEn 2015, Grupo Bimbo realizó su primer inventario completo de emisiones en todas sus plantas mexicanas.\n\n**Descubrimientos sorprendentes:**\n- 45% de emisiones venían de su flota de distribución (12,000 vehículos)\n- 30% de refrigeración en tiendas (equipos antiguos con refrigerantes)\n- 25% de operaciones de planta (hornos, calderas)\n\n**Acciones tomadas:**\n- Electrificación gradual de flota urbana\n- Reemplazo de refrigerantes en 3,500 refrigeradores\n- Optimización de rutas con IA (redujo 15% kilometraje)\n\n**Resultados en 5 años:**\n- Reducción de 18% en emisiones absolutas\n- Ahorro de $450 millones MXN en combustible\n- Primera panificadora neutra en carbono de Latinoamérica (2023)\n\nFuente: Grupo Bimbo Sustainability Report 2023',
  
  -- ACTIVITY
  activity_type = 'audit',
  activity_required = true,
  activity_config = jsonb_build_object(
    'title', 'Mapeo de Fuentes de Emisión',
    'description', 'Identifica y clasifica las fuentes de emisión en tu organización',
    'instructions', ARRAY[
      'Recorre tu lugar de trabajo (físicamente o virtualmente)',
      'Identifica al menos 5 fuentes de emisión en cada categoría (Alcance 1, 2, 3)',
      'Para cada fuente, estima: Alto/Medio/Bajo impacto y costo de reducción',
      'Prioriza 3 "victorias rápidas" (Alto impacto, Bajo costo)'
    ],
    'time_estimate', '30 minutos',
    'success_criteria', 'Lista completa de fuentes con al menos 3 acciones priorizadas',
    'reflectionPrompts', ARRAY[
      '¿Qué fuente de emisión te sorprendió más?',
      '¿Cuál crees que será la más difícil de reducir y por qué?',
      '¿Qué recursos o apoyo necesitarías para implementar tus 3 acciones prioritarias?'
    ]
  ),
  
  -- TOOLS
  tools_used = ARRAY['CarbonCalculator', 'EvidenceUploader'],
  
  -- RESOURCES
  resources = jsonb_build_array(
    jsonb_build_object(
      'title', 'Calculadora de Factor de Emisión CFE',
      'type', 'calculator',
      'url', 'https://www.gob.mx/cms/uploads/attachment/file/442905/Factor_de_Emision_del_Sistema_Electrico_Nacional_2018.pdf'
    ),
    jsonb_build_object(
      'title', 'GHG Protocol - Estándar Corporativo',
      'type', 'guide',
      'url', 'https://ghgprotocol.org/corporate-standard'
    ),
    jsonb_build_object(
      'title', 'Template: Inventario de Emisiones',
      'type', 'download',
      'url', '/resources/inventario-emisiones-template.xlsx'
    )
  ),
  
  -- NEXT STEPS
  next_steps = ARRAY[
    'Comparte tu mapeo con tu equipo o supervisor',
    'Investiga el costo aproximado de tus 3 acciones prioritarias',
    'Contacta a proveedores para cotizaciones de soluciones',
    'Documenta el estado "antes" con fotos y mediciones'
  ]

WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND lesson_order = 2;

-- ================================================================
-- LESSON 3: Calculando el ROI
-- ================================================================

UPDATE module_lessons
SET
  title = 'Calculando el ROI de Mejoras Ambientales',
  description = 'Aprende a calcular el retorno de inversión de iniciativas de calidad del aire para justificar proyectos ante la dirección.',
  estimated_minutes = 45,
  xp_reward = 50,
  
  -- STORY CONTENT
  story_content = jsonb_build_object(
    'opening', 'Carlos entra a la oficina del Director Financiero con una hoja de cálculo. "Quiero mostrarte algo", dice nerviosamente. El CFO levanta la vista con escepticismo. "¿Otro proyecto verde sin retorno?" Carlos sonríe. "Este se paga solo en 14 meses."',
    
    'dialogue', ARRAY[
      'Carlos abre la laptop: "Nuestra caldera consume $180,000 MXN al mes en gas. Una nueva caldera de alta eficiencia cuesta $800,000 pero ahorra 35% de combustible—$63,000 mensuales."',
      'El CFO hace cuentas mentalmente. "Payback de 12.7 meses... interesante. ¿Pero qué pasa con mantenimiento?"',
      'María, que espera afuera, recuerda cuando su jefe rechazó LEDs. "Muy caros", dijo. Dos años después, otra planta los instaló y ahorra $40,000 mensuales. Su jefe ahora lo lamenta.'
    ],
    
    'resolution_preview', 'El CFO se recuesta en su silla. "Necesito ver estos números para al menos 5 proyectos. Si el ROI es tan bueno como dices, los apruebo todos."',
    
    'cliffhanger', 'Carlos sale emocionado y choca con María. "¡Tenemos luz verde! Pero ahora necesitamos construir casos de negocio para cada mejora. ¿Me ayudas?"'
  ),
  
  -- LEARNING OBJECTIVES
  learning_objectives = ARRAY[
    'Calcular el retorno de inversión (ROI) de proyectos ambientales',
    'Determinar el período de recuperación (payback period)',
    'Cuantificar beneficios "suaves" (salud, productividad, reputación)',
    'Presentar casos de negocio convincentes a la dirección'
  ],
  
  -- KEY POINTS
  key_points = ARRAY[
    'ROI básico = (Ganancia Neta / Inversión Inicial) × 100',
    'Payback = Inversión Inicial / Ahorro Anual',
    'Incluir incentivos fiscales y subsidios gubernamentales',
    'Cuantificar co-beneficios: menos ausentismo, mejor productividad',
    'Comparar con costo de "no hacer nada" (multas, pérdida de clientes)'
  ],
  
  -- DID YOU KNOW
  did_you_know = ARRAY[
    'Las empresas con certificación ISO 14001 tienen 16% menos accidentes laborales',
    'México ofrece deducción fiscal del 100% en primer año para equipos eficientes energéticamente',
    'El ausentismo por enfermedades respiratorias cuesta a empresas $12,000 MXN por empleado/año'
  ],
  
  -- REAL WORLD EXAMPLE
  real_world_example = E'**Cemex - ROI de Combustibles Alternativos**\n\nEn 2018, Cemex Planta Guadalajara invirtió $15M MXN en sistema de combustibles alternativos (residuos industriales en lugar de carbón).\n\n**Análisis Financiero:**\n- Inversión: $15,000,000 MXN\n- Ahorro combustible: $8,500,000 MXN/año\n- Créditos carbono (bonos): $1,200,000 MXN/año\n- Reducción costos disposición: $800,000 MXN/año\n- **Payback: 18 meses**\n- **ROI a 5 años: 284%**\n\n**Co-Beneficios:**\n- Reducción 30% emisiones CO2\n- Calificación AAA en índice de sostenibilidad\n- Contratos preferentes con clientes ESG-conscientes\n- Ahorro acumulado 2018-2023: $52M MXN\n\nFuente: Cemex Integrated Report 2023',
  
  -- ACTIVITY
  activity_type = 'calculation',
  activity_required = true,
  activity_config = jsonb_build_object(
    'title', 'Cálculo de ROI para Tu Proyecto Prioritario',
    'description', 'Construye un caso de negocio completo para una mejora ambiental',
    'instructions', ARRAY[
      'Elige UNA de tus acciones prioritarias de la lección anterior',
      'Investiga el costo de implementación (equipo + instalación)',
      'Calcula ahorro mensual/anual (energía, combustible, mantenimiento)',
      'Suma co-beneficios cuantificables (menos ausentismo, productividad)',
      'Calcula ROI y período de payback'
    ],
    'time_estimate', '25 minutos',
    'success_criteria', 'Caso de negocio con ROI calculado y payback period',
    'reflectionPrompts', ARRAY[
      '¿Fue el ROI mejor o peor de lo que esperabas?',
      '¿Qué argumentos adicionales usarías para convencer a tu dirección?',
      '¿Qué riesgos o desafíos podría tener este proyecto?'
    ]
  ),
  
  -- TOOLS
  tools_used = ARRAY['CostCalculator', 'ReflectionJournal'],
  
  -- RESOURCES
  resources = jsonb_build_array(
    jsonb_build_object(
      'title', 'Calculadora ROI Sustentabilidad (Excel)',
      'type', 'download',
      'url', '/resources/roi-calculator-sustainability.xlsx'
    ),
    jsonb_build_object(
      'title', 'Incentivos Fiscales Verdes México 2024',
      'type', 'guide',
      'url', 'https://www.gob.mx/se/articulos/incentivos-fiscales-2024'
    ),
    jsonb_build_object(
      'title', 'Template: Caso de Negocio Ambiental',
      'type', 'download',
      'url', '/resources/business-case-template.docx'
    )
  ),
  
  -- NEXT STEPS
  next_steps = ARRAY[
    'Presenta tu caso de negocio a tu supervisor o equipo',
    'Solicita cotizaciones formales de al menos 2 proveedores',
    'Investiga programas de financiamiento verde disponibles',
    'Prepara una presentación de 5 minutos con gráficas'
  ]

WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND lesson_order = 3;

-- ================================================================
-- LESSON 4: Plan de Acción a 90 Días
-- ================================================================

UPDATE module_lessons
SET
  title = 'Creando tu Plan de Acción a 90 Días',
  description = 'Diseña e implementa un plan concreto de mejora de calidad del aire con victorias rápidas y métricas claras.',
  estimated_minutes = 60,
  xp_reward = 50,
  
  -- STORY CONTENT
  story_content = jsonb_build_object(
    'opening', 'Carlos proyecta un cronograma en la pared de la sala de juntas. "Día 1-30: Victorias rápidas. Día 31-60: Instalaciones mayores. Día 61-90: Medición y ajustes." María revisa la lista de tareas: hay mucho por hacer.',
    
    'dialogue', ARRAY[
      'El equipo de mantenimiento parece abrumado. "¿Todo esto en 90 días?" Carlos asiente. "He visto plantas hacer más en menos tiempo. Pero necesitamos su expertise para que funcione."',
      'Lupita, la dueña de la tienda vecina, asiste como representante comunitaria. "¿Y cómo sabremos si está funcionando?" Buena pregunta. María sugiere monitores visibles y reportes semanales.',
      'Don Roberto levanta la mano: "Mi nieto está en la prepa, estudiando ingeniería ambiental. ¿Podría hacer su servicio social ayudando con las mediciones?" Carlos: "¡Perfecto! Necesitamos toda la ayuda posible."'
    ],
    
    'resolution_preview', 'Todos salen con tareas asignadas. María nota algo diferente: por primera vez, parece que realmente va a pasar algo.',
    
    'cliffhanger', 'Carlos se queda solo viendo el plan. "90 días para demostrar que esto funciona. Si fallamos, nunca nos volverán a dar presupuesto verde..."'
  ),
  
  -- LEARNING OBJECTIVES
  learning_objectives = ARRAY[
    'Estructurar un plan de implementación realista',
    'Priorizar acciones en horizontes de 30-60-90 días',
    'Asignar responsabilidades y recursos',
    'Definir métricas de éxito medibles',
    'Crear sistemas de seguimiento y reporte'
  ],
  
  -- KEY POINTS
  key_points = ARRAY[
    'Días 1-30: Victorias rápidas (bajo costo, alto impacto visible)',
    'Días 31-60: Implementaciones medianas (requieren coordinación)',
    'Días 61-90: Ajustes y optimización basados en datos',
    'Regla 70/20/10: 70% esfuerzo en implementación, 20% medición, 10% ajustes',
    'Celebrar victorias pequeñas para mantener momentum'
  ],
  
  -- DID YOU KNOW
  did_you_know = ARRAY[
    'Los planes de 90 días tienen 3x más tasa de éxito que planes anuales (más enfoque, menos inercia)',
    'El 80% de proyectos ambientales fracasan por falta de seguimiento, no por falta de dinero',
    'Reportar progreso semanalmente aumenta la probabilidad de completar el plan en 47%'
  ],
  
  -- REAL WORLD EXAMPLE
  real_world_example = E'**Grupo Modelo - Plan 90 Días Planta Zacatecas**\n\nEn 2020, Grupo Modelo lanzó un plan de 90 días para reducir emisiones en su planta de Zacatecas.\n\n**Días 1-30 (Victorias Rápidas):**\n- Optimización de rutas de camiones locales (ahorro inmediato 12% diésel)\n- Reparación de fugas de aire comprimido (18 fugas encontradas)\n- Cambio a iluminación LED en áreas comunes\n- **Inversión: $420,000 MXN | Reducción: 85 ton CO2**\n\n**Días 31-60 (Instalaciones):**\n- Instalación de variadores de frecuencia en motores\n- Upgrade de calderas con economizadores\n- Sistema de recuperación de calor\n- **Inversión: $2.8M MXN | Reducción proyectada: 380 ton CO2/año**\n\n**Días 61-90 (Optimización):**\n- Monitoreo continuo con sensores IoT\n- Ajustes finos basados en datos reales\n- Capacitación de operadores en nuevos equipos\n- **Reducción adicional: 45 ton CO2 (por optimización)**\n\n**Resultado Total:**\n- 510 ton CO2 reducidas en 90 días\n- ROI: 18 meses\n- Replicado en otras 4 plantas\n\nFuente: Grupo Modelo Sustainability Report 2021',
  
  -- ACTIVITY
  activity_type = 'planning',
  activity_required = true,
  activity_config = jsonb_build_object(
    'title', 'Tu Plan de Acción de 90 Días',
    'description', 'Diseña un plan detallado y ejecutable para tu organización',
    'instructions', ARRAY[
      'Días 1-30: Selecciona 3-5 victorias rápidas con fechas específicas',
      'Días 31-60: Planea 2-3 proyectos medianos con hitos semanales',
      'Días 61-90: Define cómo medirás, reportarás y celebrarás el progreso',
      'Para cada acción: Responsable, Fecha, Presupuesto, Métrica de éxito',
      'Crea un sistema simple de seguimiento (checklist, dashboard, reuniones semanales)'
    ],
    'time_estimate', '35 minutos',
    'success_criteria', 'Plan de 90 días con al menos 10 acciones específicas, responsables asignados y métricas claras',
    'reflectionPrompts', ARRAY[
      '¿Qué obstáculos anticipas y cómo los superarías?',
      '¿Quiénes son los aliados clave que necesitas involucrar?',
      '¿Cómo comunicarás el progreso a diferentes audiencias (dirección, equipo, comunidad)?'
    ]
  ),
  
  -- TOOLS
  tools_used = ARRAY['ReflectionJournal', 'EvidenceUploader'],
  
  -- RESOURCES
  resources = jsonb_build_array(
    jsonb_build_object(
      'title', 'Template: Plan de Acción 90 Días (Google Sheets)',
      'type', 'download',
      'url', 'https://docs.google.com/spreadsheets/d/1xxx/template'
    ),
    jsonb_build_object(
      'title', 'Checklist: Victorias Rápidas en Calidad del Aire',
      'type', 'download',
      'url', '/resources/victorias-rapidas-checklist.pdf'
    ),
    jsonb_build_object(
      'title', 'Guía: Cómo Presentar Progreso a la Dirección',
      'type', 'guide',
      'url', '/resources/presenting-to-leadership.pdf'
    )
  ),
  
  -- NEXT STEPS
  next_steps = ARRAY[
    'Comparte tu plan con stakeholders clave para feedback',
    'Agenda reunión de kickoff para Día 1',
    'Prepara recursos necesarios (presupuesto, herramientas, permisos)',
    'Define quién reportará progreso y con qué frecuencia',
    '¡Comienza! El mejor plan es el que se ejecuta.'
  ]

WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND lesson_order = 4;

-- ================================================================
-- LESSON 5: Reflexión y Compromiso
-- ================================================================

UPDATE module_lessons
SET
  title = 'Reflexión Final y Compromiso de Acción',
  description = 'Consolida tu aprendizaje, reflexiona sobre el impacto potencial y comprométete con acciones concretas.',
  estimated_minutes = 30,
  xp_reward = 50,
  
  -- STORY CONTENT
  story_content = jsonb_build_object(
    'opening', '90 días después. María instala el último monitor de aire en el límite de la fábrica. PM2.5: 18 μg/m³. "¡Lo logramos!" grita a Carlos, quien sale corriendo de su oficina.',
    
    'dialogue', ARRAY[
      'Don Roberto trae a su nieto, Javier, quien muestra gráficas en su laptop. "Reducción del 48% en tres meses. Mi profesor no lo podía creer." La clase viene la próxima semana para un tour.',
      'Lupita cuelga un letrero en su tienda: "Vecinos de Fábrica Verde". Los empleados ahora almuerzan en el nuevo jardín comunitario plantado por ambos grupos.',
      'La hija de María corre hacia ella después de la escuela. "¡Mami, hace una semana que no uso mi inhalador!" María la abraza con lágrimas en los ojos. Esto es lo que importa.'
    ],
    
    'resolution_preview', 'El CFO aprueba presupuesto para Fase 2. Otras plantas del grupo quieren visitar. Un cliente importante pregunta sobre certificación ISO 14001.',
    
    'cliffhanger', 'Carlos y María miran la puesta de sol desde el jardín. "¿Sabes qué sigue?" pregunta María. Carlos sonríe. "Agua limpia. Cero residuos. Ciudades seguras. Queda mucho por hacer. ¿Estás lista?" María asiente: "Siempre."'
  ),
  
  -- LEARNING OBJECTIVES
  learning_objectives = ARRAY[
    'Reflexionar sobre el impacto potencial de las acciones aprendidas',
    'Identificar barreras personales y organizacionales',
    'Crear compromisos específicos y medibles',
    'Conectar con recursos y comunidad de apoyo',
    'Visualizar el cambio a largo plazo'
  ],
  
  -- KEY POINTS
  key_points = ARRAY[
    'El cambio real requiere compromiso sostenido, no perfección',
    'Pequeñas acciones consistentes > Grandes planes sin ejecutar',
    'El apoyo de colegas y comunidad multiplica el impacto',
    'Celebrar victorias pequeñas mantiene la motivación',
    'Tu rol importa, sin importar tu posición en la organización'
  ],
  
  -- DID YOU KNOW
  did_you_know = ARRAY[
    'El 65% de mejoras ambientales exitosas fueron iniciadas por empleados de nivel medio, no por directores',
    'Las empresas que involucran a empleados en sostenibilidad tienen 3x más retención de talento',
    'México está en top 10 global de empleos verdes (2.4 millones de empleos en 2023)'
  ],
  
  -- REAL WORLD EXAMPLE
  real_world_example = E'**Tu Historia Comienza Hoy**\n\nCada gran transformación comenzó con una persona tomando acción:\n\n- **María (personaje):** Una trabajadora de línea que se convirtió en líder de sostenibilidad\n- **Tú (real):** Completaste este módulo. Ya sabes más que 95% de empleados en México\n- **Tu organización:** Puede ser la próxima historia de éxito\n\n**¿Qué pasará en los próximos 90 días?**\nEso depende de ti.\n\nCon las herramientas de este módulo, tienes todo lo necesario para:\n- Medir tu impacto actual\n- Calcular el ROI de mejoras\n- Crear un plan de 90 días\n- Involucrar a tu comunidad\n- Demostrar resultados medibles\n\n**La pregunta no es si puedes hacer la diferencia.**\n**La pregunta es: ¿lo harás?**',
  
  -- ACTIVITY
  activity_type = 'commitment',
  activity_required = true,
  activity_config = jsonb_build_object(
    'title', 'Mi Compromiso de Acción',
    'description', 'Crea compromisos específicos y compártelos con la comunidad',
    'instructions', ARRAY[
      'Reflexiona: ¿Qué fue lo más impactante que aprendiste?',
      'Compromiso #1: Una acción que tomarás EN LOS PRÓXIMOS 7 DÍAS',
      'Compromiso #2: Un proyecto que liderarás en los próximos 90 DÍAS',
      'Compromiso #3: Un cambio a largo plazo (1 año) que impulsarás',
      'Para cada compromiso: ¿Qué, Cuándo, Cómo medirás el éxito?'
    ],
    'time_estimate', '20 minutos',
    'success_criteria', '3 compromisos específicos con fechas y métricas',
    'reflectionPrompts', ARRAY[
      '¿Qué obstáculos podrían impedirte cumplir estos compromisos?',
      '¿Quién podría apoyarte y cómo les pedirías ayuda?',
      'Si tuvieras éxito total, ¿cómo se vería tu organización en 1 año?',
      '¿Qué te motiva personalmente a trabajar en calidad del aire?'
    ]
  ),
  
  -- TOOLS
  tools_used = ARRAY['ReflectionJournal', 'EvidenceUploader'],
  
  -- RESOURCES
  resources = jsonb_build_array(
    jsonb_build_object(
      'title', 'Comunidad Crowd Conscious',
      'type', 'community',
      'url', '/communities'
    ),
    jsonb_build_object(
      'title', 'Certificado de Finalización (Descargar)',
      'type', 'certificate',
      'url', '/certificates/download'
    ),
    jsonb_build_object(
      'title', 'Próximo Módulo: Gestión del Agua',
      'type', 'course',
      'url', '/marketplace'
    ),
    jsonb_build_object(
      'title', 'Red de Embajadores de Calidad del Aire',
      'type', 'community',
      'url', '/communities/aire-limpio-ambassadors'
    )
  ),
  
  -- NEXT STEPS
  next_steps = ARRAY[
    '¡Celebra! Completaste el módulo de Aire Limpio 🎉',
    'Descarga tu certificado y compártelo en LinkedIn',
    'Únete a la comunidad Crowd Conscious para apoyo continuo',
    'Revisa el reporte de impacto de tu organización',
    'Comparte tu historia: ¿Qué acción tomarás primero?',
    'Explora otros módulos: Agua Limpia, Cero Residuos, Ciudades Seguras'
  ]

WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND lesson_order = 5;

-- ================================================================
-- VERIFY ALL LESSONS ARE ENRICHED
-- ================================================================

SELECT 
  lesson_order,
  title,
  estimated_minutes,
  xp_reward,
  CASE 
    WHEN story_content IS NOT NULL THEN '✅'
    ELSE '❌'
  END as story,
  CASE 
    WHEN array_length(learning_objectives, 1) > 0 THEN '✅'
    ELSE '❌'
  END as objectives,
  CASE 
    WHEN array_length(tools_used, 1) > 0 THEN '✅ ' || array_to_string(tools_used, ', ')
    ELSE '❌ No tools'
  END as tools,
  CASE 
    WHEN activity_config IS NOT NULL THEN '✅'
    ELSE '❌'
  END as activity
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY lesson_order;

