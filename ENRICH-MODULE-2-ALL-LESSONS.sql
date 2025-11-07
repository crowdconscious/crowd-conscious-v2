-- ENRICH-MODULE-2-ALL-LESSONS.sql
-- Enriches all 5 lessons for Module 2: Agua Limpia (Clean Water)
-- Story: María and Carlos discover their factory uses 50,000L/day - more than 200 homes combined

-- ================================
-- LESSON 2.1: Understanding Water Scarcity
-- ================================
UPDATE public.module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Carlos lleva a María al techo para ver los tanques de agua. Son enormes, llenados varias veces al día. "El acuífero bajo nuestro vecindario está bajando 1 metro cada año," lee Carlos de un informe del gobierno. "Estamos robando del futuro de nuestros hijos."

María mira la tubería principal que alimenta los tanques. El agua fluye constantemente. "¿Cuánto usamos?" pregunta. Carlos revisa las facturas. "50,000 litros por día. Eso es más que 200 hogares combinados."

Don Roberto, su vecino, había tocado la puerta esa mañana. "La presión del agua ha estado disminuyendo," había dicho. "Algunas mañanas, no sale nada." Ahora María entiende por qué.',
    'dialogue', ARRAY[
      '— ¿A dónde va toda esa agua? —pregunta María.',
      '— No lo sé —admite Carlos—. Pero creo que necesitamos averiguarlo.',
      '— Si seguimos así, ¿qué pasará con el vecindario?',
      '— Lo que ya está pasando. Pozos secos. Familias sin agua. Y nosotros seremos los culpables.'
    ],
    'resolution_preview', 'María y Carlos se dan cuenta de que la escasez de agua no es solo un problema ambiental - es un riesgo empresarial. Deben entender su huella hídrica antes de que sea demasiado tarde.',
    'cliffhanger', 'Pero, ¿dónde se está desperdiciando toda esa agua? La próxima lección revelará los "siete desperdicios mortales" que nadie está vigilando...'
  ),
  learning_objectives = ARRAY[
    'Identificar los tres componentes de la huella hídrica (agua azul, verde y gris)',
    'Calcular la intensidad de agua de tu operación y compararla con puntos de referencia de la industria',
    'Reconocer los riesgos empresariales relacionados con el agua (regulatorio, operacional, financiero)',
    'Evaluar el impacto del estrés hídrico en tu cadena de valor',
    'Documentar las fuentes y usos de agua en tus instalaciones'
  ],
  key_points = ARRAY[
    '60% de México enfrenta estrés hídrico moderado a severo',
    'El acuífero de la Ciudad de México baja 40cm por año',
    'Intensidad de agua = Uso anual (m³) ÷ Unidades producidas',
    'Tres componentes: Agua azul (directa), verde (agricultura), gris (contaminación)',
    'Riesgos empresariales: Restricciones de agua, costos crecientes, daño reputacional',
    'Empresas líderes usan 30-50% menos agua que el promedio de la industria'
  ],
  did_you_know = ARRAY[
    '11 millones de mexicanos carecen de acceso a agua potable mientras la industria usa 10% del agua total',
    'Constellation Brands perdió $1B en inversión cuando la comunidad de Mexicali se opuso a su cervecería debido a escasez de agua',
    'Para 2050, la demanda de agua en México superará la oferta en un 40% (proyecciones CONAGUA)',
    'Una sola fábrica puede usar tanto agua como 200+ hogares, impactando directamente a comunidades vecinas'
  ],
  real_world_example = 'Constellation Brands planeó una cervecería de $1.5B en Mexicali. La comunidad se opuso debido a la escasez de agua severa. Protestas masivas resultaron en la fábrica siendo quemada. La empresa abandonó el proyecto, perdiendo $1B en inversión. Lección crítica: Derechos de agua sin apoyo comunitario = riesgo empresarial catastrófico.',
  activity_type = 'assessment',
  activity_config = jsonb_build_object(
    'instructions', 'Realiza una auditoría de uso directo de agua recorriendo tus instalaciones. Documenta cuánta agua usa cada área: producción (enfriamiento, lavado, vapor), operaciones de apoyo (baños, cocina, jardinería), y fugas visibles. Calcula tu intensidad de agua (uso anual ÷ unidades producidas) y compárala con el promedio de tu industria.',
    'reflectionPrompts', ARRAY[
      '¿Cuáles son los tres principales usos de agua en tus instalaciones?',
      '¿Cómo se compara tu intensidad de agua con el punto de referencia de tu industria?',
      '¿Qué porcentaje de tu agua es realmente necesaria para el proceso productivo vs. operaciones de apoyo?',
      '¿Cómo podría el estrés hídrico local afectar tu capacidad para operar en 5 años?'
    ],
    'successCriteria', ARRAY[
      'Auditoría completa de uso de agua por área',
      'Cálculo de intensidad de agua (L/unidad producida)',
      'Comparación con punto de referencia de la industria',
      'Identificación de 3+ áreas de alto consumo',
      'Evaluación de riesgo de escasez de agua local'
    ],
    'estimatedMinutes', 45
  ),
  activity_required = true,
  tools_used = ARRAY['CostCalculator', 'ReflectionJournal', 'EvidenceUploader'],
  resources = jsonb_build_object(
    'downloads', jsonb_build_array(
      jsonb_build_object(
        'title', 'Plantilla de Auditoría de Uso de Agua',
        'url', '/resources/water-audit-template.xlsx',
        'type', 'xlsx'
      ),
      jsonb_build_object(
        'title', 'Puntos de Referencia de Intensidad de Agua por Industria',
        'url', '/resources/water-intensity-benchmarks.pdf',
        'type', 'pdf'
      )
    ),
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Mapa de Estrés Hídrico de México (CONAGUA)',
        'url', 'https://www.gob.mx/conagua',
        'description', 'Visualiza qué áreas de México enfrentan mayor estrés hídrico'
      ),
      jsonb_build_object(
        'title', 'GRI 303: Water and Effluents Standard',
        'url', 'https://www.globalreporting.org/standards/media/1909/gri-303-water-and-effluents-2018.pdf',
        'description', 'Estándar internacional para reporte de agua'
      )
    ),
    'videos', jsonb_build_array(
      jsonb_build_object(
        'title', 'Crisis del Agua en México: Perspectiva Empresarial',
        'url', 'https://www.youtube.com/watch?v=example',
        'duration', '12:30'
      )
    )
  ),
  next_steps = ARRAY[
    'Realizar recorrido completo de instalaciones con enfoque en puntos de uso de agua',
    'Recopilar facturas de agua de los últimos 12 meses para análisis de tendencias',
    'Identificar áreas de alto consumo de agua para auditoría detallada',
    'Investigar puntos de referencia de intensidad de agua específicos de tu industria',
    'Prepararse para la Lección 2.2: Los Siete Desperdicios Mortales del Agua'
  ],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM public.marketplace_modules
  WHERE core_value = 'clean_water' AND status = 'published'
  LIMIT 1
)
AND lesson_order = 1;

-- ================================
-- LESSON 2.2: The Seven Deadly Wastes of Water
-- ================================
UPDATE public.module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María recorre la fábrica con un bloc de notas. En el baño, un inodoro corre constantemente. "Nadie lo reportó," dice el supervisor. María hace cálculos rápidos: 400 litros por día, solo de ese inodoro.

En el área de producción, una máquina de enfriamiento descarga agua limpia directamente al drenaje. "¿Por qué no la reutilizamos?" pregunta María. El supervisor se encoge de hombros. "Así es como siempre lo hemos hecho."

Al final del día, María ha encontrado siete tipos de desperdicios. Y apenas ha revisado la mitad de la fábrica.',
    'dialogue', ARRAY[
      '— Cada fuga es dinero por el drenaje —dice Carlos mirando la lista de María.',
      '— No es solo dinero. Es agua que las familias del vecindario necesitan.',
      '— ¿Cuánto crees que estamos desperdiciando en total?',
      '— Si estos son solo los desperdicios obvios... podríamos estar tirando 30-40% de nuestra agua.',
      '— Entonces tenemos mucho trabajo por hacer.'
    ],
    'resolution_preview', 'Los siete tipos de desperdicios de agua están ocultos a plena vista. Una vez que aprendes a verlos, están en todas partes. Pero eso significa que también hay oportunidades de ahorro en todas partes.',
    'cliffhanger', 'María encontró los desperdicios. Ahora viene la parte difícil: convencer a todos de que vale la pena arreglarlos. ¿Cuál será el retorno de inversión? La próxima lección revelará las soluciones...'
  ),
  learning_objectives = ARRAY[
    'Identificar los siete tipos comunes de desperdicio de agua en instalaciones industriales',
    'Estimar el costo financiero de fugas y desperdicios usando fórmulas simples',
    'Priorizar reparaciones basándose en gravedad de fuga y tasa de flujo',
    'Realizar una auditoría de desperdicios usando metodología sistemática',
    'Calcular el período de retorno para reparaciones de fugas'
  ],
  key_points = ARRAY[
    'Siete desperdicios: Fugas, enfriamiento una sola vez, exceso de lavado, inodoros/grifos ineficientes, condensado desperdiciado, jardinería ineficiente, procesos sin optimizar',
    'Una fuga de 200ml/min = 105,000L/año = $2,100 MXN desperdiciados',
    'Fugas priorizadas: Goteo (<100ml/min) 🟢, Chorro (100-500ml/min) 🟡, Flujo (>500ml/min) 🔴',
    'Reparar fugas típicamente se paga en <6 meses',
    'El desperdicio #1 más común es enfriamiento de un solo paso (90% reducción posible)',
    'Auditar de noche cuando es más fácil detectar fugas ocultas'
  ],
  did_you_know = ARRAY[
    'Un solo inodoro con fuga puede desperdiciar 400L/día - suficiente agua potable para 8 personas',
    'El Centro de Distribución OXXO en Monterrey ahorró 5,000m³/año (40% de consumo) solo con reutilización',
    'Optimizar enjuague de galvanoplastia puede ahorrar 80% de agua con inversión de $150,000 MXN y retorno <1 año',
    'Las plantas que usan xeriscape (paisajismo tolerante a sequía) usan 70-90% menos agua para jardinería'
  ],
  real_world_example = 'Centro de Distribución OXXO (Monterrey): Durante la sequía de 2022, instaló cosecha de agua de lluvia (techo 10,000m²) capturando 3,000m³/año, trató condensado de AC (500m³/año), y reutilizó agua de lavado de camiones (1,500m³/año). Reutilización total: 5,000m³/año (40% de consumo). Inversión: $280,000 MXN. Retorno: 1.7 años.',
  activity_type = 'audit',
  activity_config = jsonb_build_object(
    'instructions', 'Realiza una "Búsqueda de Desperdicios de Agua" completa. Parte 1: Detección de fugas (preferiblemente de noche) - recorre instalaciones escuchando agua corriendo, verifica todos grifos/inodoros/tuberías. Usa el medidor de agua: apaga todos los usos y verifica si el medidor aún corre. Parte 2: Auditoría de equipos - para cada proceso que usa agua, documenta edad, flujo (L/min), horas de operación, y potencial de reducción. Parte 3: Encuesta a empleados sobre dónde ven desperdicios.',
    'reflectionPrompts', ARRAY[
      '¿Cuáles fueron los tres desperdicios de agua más grandes que encontraste?',
      '¿Cuál es el costo anual estimado de tus desperdicios de agua (en MXN)?',
      '¿Qué reparaciones tienen el período de retorno más corto?',
      '¿Qué te sorprendió más durante la auditoría de desperdicios?',
      '¿Cómo puedes involucrar a los empleados en la reducción de desperdicios?'
    ],
    'successCriteria', ARRAY[
      'Auditoría completa de fugas con ubicación y gravedad',
      'Lista priorizada de reparaciones (🔴 🟡 🟢)',
      'Estimación de agua desperdiciada (L/día) por fuente',
      'Cálculo de costo de desperdicios (MXN/año)',
      'Análisis costo-beneficio para las 5 principales reparaciones',
      'Fotos documentando desperdicios principales'
    ],
    'estimatedMinutes', 60
  ),
  activity_required = true,
  tools_used = ARRAY['CostCalculator', 'EvidenceUploader', 'ReflectionJournal'],
  resources = jsonb_build_object(
    'downloads', jsonb_build_array(
      jsonb_build_object(
        'title', 'Checklist de Auditoría de Desperdicios de Agua',
        'url', '/resources/water-waste-audit-checklist.pdf',
        'type', 'pdf'
      ),
      jsonb_build_object(
        'title', 'Calculadora de Costo de Fugas',
        'url', '/resources/leak-cost-calculator.xlsx',
        'type', 'xlsx'
      )
    ),
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Guía de Detección y Reparación de Fugas',
        'url', 'https://www.epa.gov/watersense/fix-leak-week',
        'description', 'Métodos prácticos para encontrar y reparar fugas comunes'
      )
    ),
    'videos', jsonb_build_array(
      jsonb_build_object(
        'title', 'Cómo Detectar Fugas Ocultas en Instalaciones Industriales',
        'url', 'https://www.youtube.com/watch?v=example',
        'duration', '15:20'
      )
    )
  ),
  next_steps = ARRAY[
    'Completar auditoría de desperdicios en próximos 7 días',
    'Priorizar fugas 🔴 para reparación inmediata (<24 horas)',
    'Obtener cotizaciones para las 5 principales reparaciones',
    'Crear cronograma de reparación para fugas 🟡 y 🟢',
    'Prepararse para Lección 2.3: Soluciones de reutilización de agua'
  ],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM public.marketplace_modules
  WHERE core_value = 'clean_water' AND status = 'published'
  LIMIT 1
)
AND lesson_order = 2;

-- ================================
-- LESSON 2.3: Closing the Loop
-- ================================
UPDATE public.module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María visita la casa de Don Roberto. Su tanque de agua de lluvia está lleno, las canaletas relucientes. "Lo instalé el año pasado," dice orgulloso. "No he pagado por agua en 8 meses."

María mira el techo de la fábrica - al menos 10 veces más grande que el de Don Roberto. "¿Podríamos hacer algo similar?" pregunta a Carlos al regresar. Carlos saca su calculadora. "Con 5,000 metros cuadrados de techo y 600mm de lluvia anual... podríamos capturar 2,400 metros cúbicos al año."

"Eso es casi $50,000 MXN en agua gratis," dice María. "¿Por qué no lo hemos hecho?"',
    'dialogue', ARRAY[
      '— ¿Y si no solo ahorramos agua, sino que la reutilizamos? —pregunta María.',
      '— El agua de enfriamiento es limpia cuando sale de las máquinas. ¿Por qué la tiramos?',
      '— Podríamos usarla para los inodoros, la jardinería, incluso para limpiar.',
      '— Es como cerrar un círculo. El agua no se desperdicia, solo se transforma.',
      '— Exacto. Necesitamos pensar en nuestro sistema de agua de manera completamente diferente.'
    ],
    'resolution_preview', 'La reutilización de agua no es solo sobre instalar tecnología cara. Es sobre rediseñar el sistema: cascada de agua de limpia a menos limpia, capturar lo que cae del cielo, recircular lo que usas. El agua puede tener múltiples vidas.',
    'cliffhanger', 'Con un plan de reutilización en mano, María se pregunta: ¿qué pasaría si no solo resolvemos nuestro problema de agua, sino que ayudamos al vecindario a resolver el suyo? La próxima lección explora alianzas comunitarias...'
  ),
  learning_objectives = ARRAY[
    'Diseñar un sistema de cascada de agua para reutilización interna',
    'Calcular el potencial de cosecha de agua de lluvia para tus instalaciones',
    'Identificar oportunidades de reutilización de aguas grises',
    'Evaluar la viabilidad de recirculación de agua de enfriamiento',
    'Desarrollar un diagrama de flujo de agua "antes y después" con mejoras'
  ],
  key_points = ARRAY[
    'Jerarquía de reutilización: Reutilización directa → Uso en cascada → Tratamiento y reutilización → Recarga subterránea',
    'Potencial de agua de lluvia = Área techo (m²) × Lluvia (mm) × 0.8',
    'Recirculación de enfriamiento puede reducir uso 90-99% vs. un solo paso',
    'Agua de calidad potable frecuentemente usada donde no se necesita (jardinería, inodoros)',
    'Empresas líderes reutilizan 40-60% de su agua',
    'Unilever Toluca: 60% reutilización = 67% reducción en intensidad de agua'
  ],
  did_you_know = ARRAY[
    'Lala (empresa láctea) ahorró $6.8M MXN/año optimizando sistemas de enfriamiento y bombas de velocidad variable en 11 plantas',
    'Unilever Toluca trata 100% de aguas residuales en sitio y reutiliza 60% de vuelta a producción, reduciendo uso de 2.7 L/unidad a 0.9 L/unidad',
    'Un techo de 5,000m² en CDMX puede capturar 2,400m³/año de agua de lluvia = $48,000 MXN ahorrados',
    'Grupo Cementos de Chihuahua logró Descarga Líquida Cero (ZLD): 100% de reciclaje, cero aguas residuales'
  ],
  real_world_example = 'Unilever Toluca instaló tratamiento de aguas residuales en sitio, trata 100% del agua de proceso, reutiliza 60% de vuelta a producción, y el 40% restante es lo suficientemente limpio para recarga de agua subterránea. Redujo uso de 2.7 L/unidad de producto a 0.9 L/unidad (67% de reducción). Costo de agua reducido 58%. Ganó múltiples premios de sostenibilidad.',
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'instructions', 'Crea un diagrama de flujo de agua para tus instalaciones. Paso 1: Mapear estado actual - dibuja entradas de agua, usos finales, y salidas de aguas residuales con flujos (L/día). Paso 2: Identificar oportunidades de reutilización - código de color del agua por calidad necesaria (🔵 Potable, 🟢 Proceso, 🟡 Limpieza/enfriamiento, 🟤 Jardinería). Paso 3: Diseñar sistema mejorado - agregar medidas de conservación, circuitos de reutilización, y tratamiento necesario. Calcula reducción proyectada de uso de agua fresca.',
    'reflectionPrompts', ARRAY[
      '¿Qué porcentaje de tu agua actualmente se usa una sola vez y se descarta?',
      '¿Dónde estás usando agua de calidad potable cuando agua de menor calidad sería suficiente?',
      '¿Cuál es la oportunidad #1 de reutilización más grande en tus instalaciones?',
      '¿Qué inversión se requeriría para implementar tu sistema de reutilización diseñado?',
      '¿Cuál sería el período de retorno estimado?'
    ],
    'successCriteria', ARRAY[
      'Diagrama de flujo "Estado Actual" completo con flujos cuantificados',
      'Diagrama de flujo "Estado Futuro" con mejoras de reutilización',
      'Identificación de 3+ oportunidades de reutilización',
      'Cálculo de reducción proyectada de agua fresca (%)',
      'Estimación de inversión requerida',
      'Cálculo de período de retorno'
    ],
    'estimatedMinutes', 50
  ),
  activity_required = true,
  tools_used = ARRAY['CostCalculator', 'ReflectionJournal', 'EvidenceUploader'],
  resources = jsonb_build_object(
    'downloads', jsonb_build_array(
      jsonb_build_object(
        'title', 'Plantilla de Diagrama de Flujo de Agua',
        'url', '/resources/water-flow-diagram-template.pptx',
        'type', 'pptx'
      ),
      jsonb_build_object(
        'title', 'Calculadora de Cosecha de Agua de Lluvia',
        'url', '/resources/rainwater-harvest-calculator.xlsx',
        'type', 'xlsx'
      ),
      jsonb_build_object(
        'title', 'Guía de Tecnologías de Reutilización de Agua',
        'url', '/resources/water-reuse-technologies.pdf',
        'type', 'pdf'
      )
    ),
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'EPA WaterSense: Water Reuse Guide',
        'url', 'https://www.epa.gov/waterreuse',
        'description', 'Guía completa de opciones de reutilización de agua'
      )
    ),
    'videos', jsonb_build_array(
      jsonb_build_object(
        'title', 'Sistemas de Reutilización de Agua: Casos de Éxito',
        'url', 'https://www.youtube.com/watch?v=example',
        'duration', '18:45'
      )
    )
  ),
  next_steps = ARRAY[
    'Finalizar diseño de sistema de reutilización con equipo técnico',
    'Obtener cotizaciones de proveedores para componentes clave',
    'Calcular ROI detallado incluyendo ahorros de agua y costos de tratamiento evitados',
    'Identificar potenciales fuentes de financiamiento (ahorros operativos, créditos verdes)',
    'Prepararse para Lección 2.4: Construir alianzas de agua con la comunidad'
  ],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM public.marketplace_modules
  WHERE core_value = 'clean_water' AND status = 'published'
  LIMIT 1
)
AND lesson_order = 3;

-- ================================
-- LESSON 2.4: Building Water Partnerships
-- ================================
UPDATE public.module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Don Roberto toca la puerta de la fábrica con una propuesta. "La escuela del barrio necesita agua limpia. Su filtro está roto." María y Carlos intercambian miradas. Acaban de calcular que podrían ahorrar 12,000 litros por día. ¿Y si usaran esos ahorros para ayudar?

"¿Cuánto costaría un nuevo filtro para la escuela?" pregunta María. Don Roberto consulta sus notas. "15,000 pesos. Pero necesitaríamos ayuda para instalarlo."

Carlos sonríe. "Nosotros podemos hacer eso. Y quizás más."',
    'dialogue', ARRAY[
      '— Si arreglamos la escuela, ¿qué más necesita el vecindario? —pregunta María.',
      '— El parque comunitario. Su sistema de riego está roto, usa demasiada agua.',
      '— Podríamos instalar riego por goteo. Ahorraría 50% de agua.',
      '— Y enseñar a las familias sobre conservación de agua en casa.',
      '— No es solo sobre nuestra fábrica. Es sobre toda la comunidad.',
      '— Exacto. Estamos todos en el mismo acuífero.'
    ],
    'resolution_preview', 'El agua conecta a todos. Cuando una empresa y una comunidad trabajan juntas en soluciones hídricas, ambos ganan. La empresa gana licencia social para operar. La comunidad gana acceso a agua limpia y seguridad hídrica.',
    'cliffhanger', 'Con una alianza comunitaria en marcha, María se pregunta: ¿cómo medir todo este impacto? ¿Cómo reportar resultados a inversores y reguladores? La lección final revelará el sistema de métricas...'
  ),
  learning_objectives = ARRAY[
    'Identificar necesidades hídricas prioritarias en tu comunidad local',
    'Diseñar un proyecto de alianza agua-comunidad con roles claros',
    'Calcular el impacto social y ambiental de intervenciones hídricas comunitarias',
    'Crear un modelo de asociación empresa-gobierno-comunidad',
    'Desarrollar métricas de compromiso comunitario para reportes ESG'
  ],
  key_points = ARRAY[
    'Empresas positivas en agua: Dan más agua de la que toman (ejemplo: Fundación Coca-Cola)',
    'Tres tipos de proyectos comunitarios: Acceso a agua limpia, restauración de cuenca, educación sobre conservación',
    'Alianzas efectivas incluyen: Empresa (financiamiento/expertise) + Gobierno (permisos/terreno) + Comunidad (participación/mantenimiento)',
    'Reportes ESG requieren: # personas con acceso mejorado, litros de agua proporcionados, puntuación de satisfacción',
    'Coca-Cola FEMSA: 50 hectáreas de humedales restaurados, 200+ pozos comunitarios mantenidos',
    'CDP Water Security Questionnaire: Empresas de Lista A obtienen acceso preferente a capital'
  ],
  did_you_know = ARRAY[
    'Fundación Coca-Cola ha invertido $15M MXN en proyectos de acceso al agua en México, beneficiando a 100,000+ personas',
    'Empresas que divulgan datos de agua a través de CDP tienen 50% más probabilidad de atraer inversión ESG',
    'El Estándar GRI 303 requiere divulgación de operaciones en áreas con estrés hídrico - 60% de México califica',
    'Alianzas de agua empresa-comunidad reducen quejas comunitarias 80% en promedio (estudio McKinsey 2023)'
  ],
  real_world_example = 'Fundación Coca-Cola y socios: Desde 2007, repuesto 100% del agua usada en producción en México. Proyectos incluyen: 85,000 personas con acceso mejorado a agua, restauración de 50 hectáreas de humedales, mantenimiento de 200+ pozos comunitarios en áreas rurales. Resultado: Compañía positiva en agua - da más de lo que toma.',
  activity_type = 'project',
  activity_config = jsonb_build_object(
    'instructions', 'Diseña un proyecto de agua comunitario. Elige una opción: A) Proyecto de acceso a agua limpia (quiosco o filtración escolar), B) Proyecto de restauración de cuenca (limpieza y plantación), o C) Programa de educación sobre agua (escuelas + kits de ahorro). Requisitos: 1) Evaluación de necesidades (encuestar comunidad), 2) Modelo de alianza (quién hace qué), 3) Presupuesto (costo total y fuentes), 4) Cronograma (plan 6-12 meses), 5) Métricas de impacto (# personas, litros ahorrados), 6) Plan de sostenibilidad (mantenimineto a largo plazo).',
    'reflectionPrompts', ARRAY[
      '¿Cuál es la necesidad hídrica #1 más urgente en tu comunidad local?',
      '¿Qué recursos únicos puede aportar tu empresa (más allá de dinero)?',
      '¿Quiénes serían los socios ideales (gobierno, ONGs, líderes comunitarios)?',
      '¿Cómo asegurarías que el proyecto sea sostenible después del año 1?',
      '¿Qué resistencias o desafíos anticipas y cómo los superarías?'
    ],
    'successCriteria', ARRAY[
      'Evaluación de necesidades comunitarias documentada',
      'Propuesta de proyecto completa (3-5 páginas)',
      'Modelo de alianza claro con roles definidos',
      'Presupuesto detallado con fuentes de financiamiento',
      'Cronograma de implementación (6-12 meses)',
      'Métricas de impacto cuantificadas',
      'Plan de sostenibilidad a largo plazo'
    ],
    'estimatedMinutes', 60
  ),
  activity_required = true,
  tools_used = ARRAY['CostCalculator', 'ReflectionJournal', 'EvidenceUploader'],
  resources = jsonb_build_object(
    'downloads', jsonb_build_array(
      jsonb_build_object(
        'title', 'Plantilla de Propuesta de Alianza Comunitaria',
        'url', '/resources/community-partnership-template.docx',
        'type', 'docx'
      ),
      jsonb_build_object(
        'title', 'Calculadora de Impacto de Proyectos de Agua',
        'url', '/resources/water-project-impact-calculator.xlsx',
        'type', 'xlsx'
      )
    ),
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'GRI 303: Water and Effluents Standard',
        'url', 'https://www.globalreporting.org/standards/media/1909/gri-303-water-and-effluents-2018.pdf',
        'description', 'Estándar para reporte de agua y compromiso comunitario'
      ),
      jsonb_build_object(
        'title', 'CDP Water Security Questionnaire',
        'url', 'https://www.cdp.net/en/water',
        'description', 'Cuestionario usado por inversionistas para evaluar riesgo hídrico'
      )
    ),
    'videos', jsonb_build_array(
      jsonb_build_object(
        'title', 'Alianzas de Agua: Casos de Éxito en México',
        'url', 'https://www.youtube.com/watch?v=example',
        'duration', '16:30'
      )
    )
  ),
  next_steps = ARRAY[
    'Investigar necesidades hídricas comunitarias locales (encuestas, entrevistas)',
    'Identificar potenciales socios (gobierno municipal, ONGs, escuelas)',
    'Estimar costos y fuentes de financiamiento',
    'Desarrollar propuesta preliminar de proyecto',
    'Prepararse para Lección 2.5: Métricas y reportes de desempeño hídrico'
  ],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM public.marketplace_modules
  WHERE core_value = 'clean_water' AND status = 'published'
  LIMIT 1
)
AND lesson_order = 4;

-- ================================
-- LESSON 2.5: Every Drop Counts
-- ================================
UPDATE public.module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Un mes después, el medidor de agua de la fábrica cuenta una historia nueva: 38,000 litros por día, bajó de 50,000. Una reducción del 24%. Las reparaciones de fugas, el sistema de reutilización, los accesorios de bajo flujo - todo suma.

El vecindario de Don Roberto tiene mejor presión de agua ahora. Las madres ya no esperan hasta la madrugada para llenar cubetas. La escuela tiene un nuevo filtro de agua, instalado por el equipo de mantenimiento de María.

"Hicimos esto juntos," dice Carlos al equipo reunido. "Y apenas estamos comenzando."',
    'dialogue', ARRAY[
      '— Miren estos números —María proyecta el panel de agua en la pared.',
      '— 12,000 litros ahorrados por día. $240,000 pesos al año.',
      '— Pero es más que dinero. Don Roberto me dijo que su familia tiene agua todo el día ahora.',
      '— Cinco familias nos enviaron cartas de agradecimiento.',
      '— ¿Y si más empresas hicieran esto? ¿Qué pasaría con nuestras ciudades?',
      '— Creo que estamos por descubrirlo. Otras fábricas ya están preguntando cómo lo hicimos.'
    ],
    'resolution_preview', 'Medir el progreso transforma "esperamos estar mejorando" en "sabemos exactamente cuánto hemos mejorado". Las métricas correctas crean responsabilidad, celebran victorias, y revelan oportunidades. Cada gota cuenta cuando cuentas cada gota.',
    'cliffhanger', 'La fábrica de María ahora usa 24% menos agua. Pero la ciudad completa aún enfrenta estrés hídrico. ¿Qué más se puede hacer? El siguiente módulo explorará cómo ciudades enteras pueden transformarse...'
  ),
  learning_objectives = ARRAY[
    'Configurar un sistema de seguimiento de KPIs de agua (ambientales, sociales, financieros)',
    'Calcular intensidad de agua y comparar con puntos de referencia de industria',
    'Preparar divulgaciones de agua para estándares ESG (GRI 303, CDP)',
    'Diseñar un panel visual de desempeño hídrico',
    'Comunicar resultados hídricos a partes interesadas internas y externas'
  ],
  key_points = ARRAY[
    'KPIs ambientales clave: Extracción total (m³/año), intensidad (m³/unidad), tasa de reutilización (%), calidad de descarga',
    'KPIs sociales: # personas con acceso mejorado, quejas comunitarias (meta: cero), satisfacción comunitaria',
    'KPIs financieros: Ahorro de costos (MXN/año), ROI de proyectos, riesgo reducido',
    'Benchmarks líderes: Coca-Cola FEMSA 1.7 L/L producto, BMW 2.13 m³/auto, Levis Water<Less 96% menos agua',
    'Divulgaciones requeridas: GRI 303 (extracción, consumo, intensidad, calidad), CDP (seguridad hídrica)',
    'Panel debe mostrar: Tendencias mensuales, vs. benchmarks, proyecciones de ahorro'
  ],
  did_you_know = ARRAY[
    'Coca-Cola FEMSA logró 1.7 L agua por 1 L bebida - líder mundial de la industria',
    'Tecnología Water<Less de Levis usa solo 1.5 L para acabado de jeans vs. 42 L tradicional (96% reducción)',
    'BMW redujo uso de 4+ m³ por auto en 2006 a 2.13 m³ en 2024 (47% reducción)',
    'Empresas que divulgan datos a CDP Water tienen 50% más probabilidad de atraer inversión ESG'
  ],
  real_world_example = 'Coca-Cola FEMSA México: Alcanzó intensidad de agua de 1.7 L por 1 L de bebida producida (líder global de la industria, meta mundial <2.0 L). Logrado mediante: Optimización de CIP, recirculación de agua de enfriamiento, tratamiento y reutilización de aguas residuales, proyectos de eficiencia en 18 plantas. Resultado: Líder en eficiencia hídrica + reputación de sostenibilidad.',
  activity_type = 'dashboard',
  activity_config = jsonb_build_object(
    'instructions', 'Crea un Panel de Desempeño de Agua integral. Configura tabla de métricas mensuales con: Uso total (m³), intensidad (L/unidad), costo (MXN), fugas reparadas, agua reutilizada (%), calidad de descarga (DBO), quejas comunitarias, satisfacción empleados. Crea elementos visuales: Gráfico de tendencia de uso mensual, intensidad vs. benchmark de industria, gráfico circular de % reutilización, rastreador de ahorro de costos. Establece calendario de reporte: Semanal (equipo operaciones), Mensual (gerencia), Trimestral (ESG), Anual (divulgación externa).',
    'reflectionPrompts', ARRAY[
      '¿Cuál es tu KPI de agua #1 más importante para seguir y por qué?',
      '¿Cómo se compara tu intensidad de agua actual con el benchmark de tu industria?',
      '¿Qué mejoras te gustaría celebrar en tu primera actualización mensual?',
      '¿Cómo compartirás resultados de agua con empleados para mantener compromiso?',
      '¿Qué meta de reducción de agua establecerás para el próximo año (realista pero ambiciosa)?'
    ],
    'successCriteria', ARRAY[
      'Panel de métricas completo (Excel o Google Sheets)',
      'Fórmulas automatizadas para cálculos de KPIs',
      'Visualizaciones de datos (gráficos de tendencias, comparaciones)',
      'Benchmarks de industria incluidos para comparación',
      'Calendario de reporte definido',
      'Sistema configurado para actualizaciones mensuales'
    ],
    'estimatedMinutes', 45
  ),
  activity_required = true,
  tools_used = ARRAY['CostCalculator', 'ReflectionJournal', 'ImpactComparison'],
  resources = jsonb_build_object(
    'downloads', jsonb_build_array(
      jsonb_build_object(
        'title', 'Plantilla de Panel de Desempeño Hídrico',
        'url', '/resources/water-performance-dashboard.xlsx',
        'type', 'xlsx'
      ),
      jsonb_build_object(
        'title', 'Guía de Divulgación GRI 303',
        'url', '/resources/gri-303-disclosure-guide.pdf',
        'type', 'pdf'
      ),
      jsonb_build_object(
        'title', 'Benchmarks de Intensidad de Agua por Industria',
        'url', '/resources/water-intensity-benchmarks-detailed.pdf',
        'type', 'pdf'
      )
    ),
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'GRI 303: Water and Effluents 2018',
        'url', 'https://www.globalreporting.org/standards/media/1909/gri-303-water-and-effluents-2018.pdf',
        'description', 'Estándar completo para reporte de agua'
      ),
      jsonb_build_object(
        'title', 'CDP Water Security',
        'url', 'https://www.cdp.net/en/water',
        'description', 'Cuestionario de seguridad hídrica para inversionistas'
      )
    ),
    'videos', jsonb_build_array(
      jsonb_build_object(
        'title', 'Cómo Reportar Desempeño Hídrico para ESG',
        'url', 'https://www.youtube.com/watch?v=example',
        'duration', '14:20'
      )
    )
  ),
  next_steps = ARRAY[
    'Finalizar configuración de panel con datos de línea base',
    'Establecer meta de reducción de agua para próximo año',
    'Compartir panel con equipo de liderazgo',
    'Programar revisión mensual de métricas de agua',
    'Comenzar preparación para divulgación anual (GRI, CDP)',
    'Celebrar victorias con equipo y comunidad',
    '¡Prepararse para Módulo 3: Ciudades Seguras!'
  ],
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM public.marketplace_modules
  WHERE core_value = 'clean_water' AND status = 'published'
  LIMIT 1
)
AND lesson_order = 5;

-- ================================
-- Verification Query
-- ================================
-- Run this to verify all 5 lessons were enriched successfully
SELECT 
    mm.title as module_title,
    ml.lesson_order,
    ml.title as lesson_title,
    (ml.story_content IS NOT NULL) as has_story,
    (ml.learning_objectives IS NOT NULL) as has_objectives,
    (ml.activity_config IS NOT NULL) as has_activity,
    (ml.tools_used IS NOT NULL) as has_tools,
    array_length(ml.learning_objectives, 1) as objective_count,
    array_length(ml.key_points, 1) as key_point_count,
    array_length(ml.tools_used, 1) as tool_count
FROM public.marketplace_modules mm
JOIN public.module_lessons ml ON mm.id = ml.module_id
WHERE mm.core_value = 'clean_water' AND mm.status = 'published'
ORDER BY ml.lesson_order;

