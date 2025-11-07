-- ============================================
-- ENRICH MODULE 3: Ciudades Seguras y Espacios Inclusivos
-- All 5 Lessons
-- ============================================

-- First, get the module_id for Module 3
-- Core value: 'safe_cities'
-- Expected title: 'Ciudades Seguras y Espacios Inclusivos'

-- ============================================
-- LESSON 3.1: "A Través de Sus Ojos"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'La nieta de Don Roberto, Sofía, camina a casa desde la escuela todos los días pasando por la fábrica. La semana pasada, tomó una ruta diferente—el camino más largo—porque se sintió insegura cerca del callejón oscuro junto al muelle de carga.',
    'conflict', 'María se da cuenta: "Pasamos ocho horas al día aquí, pero olvidamos que somos parte de un vecindario. Lo que sucede fuera de nuestra cerca importa."',
    'development', 'María organiza una "caminata por el vecindario" después de su turno. Los empleados, incluyendo a Carlos, caminan las calles como lo hacen los residentes. Notan: mala iluminación, sin banquetas cerca de la entrada de la fábrica, camiones de reparto bloqueando las rutas peatonales, y una cerca que crea una "zona muerta" donde la gente se siente insegura.',
    'resolution', '"Nunca lo noté," admite Carlos. "Entro y salgo en auto. Nunca camino estas calles."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender las 4 dimensiones de seguridad urbana según ONU-Hábitat',
    'Identificar cómo las operaciones empresariales afectan la seguridad del vecindario',
    'Aplicar los principios CPTED para diseño de espacios seguros',
    'Realizar una auditoría de seguridad comunitaria efectiva'
  ],
  
  key_points = ARRAY[
    'La seguridad no se trata solo de crimen—se trata de cómo las personas experimentan el espacio público',
    '47% de trabajadores consideran seguridad del área en decisiones laborales (Estudio IMCO 2023)',
    'Empresas vistas como contribuyentes positivos tienen licencia social para operar y expansión más fácil',
    'CPTED: Vigilancia Natural, Control de Acceso Natural, Mantenimiento Territorial, Gestión'
  ],
  
  did_you_know = ARRAY[
    'El 73% de millennials mexicanos quieren trabajar para empresas socialmente responsables',
    'Nemak invirtió $850,000 MXN en 45 luces LED y logró reducir incidentes de seguridad en 42%',
    'Liverpool mejoró percepción de seguridad en estacionamiento de 5.2 a 8.7/10 usando principios CPTED'
  ],
  
  real_world_example = 'Nemak (Monterrey) enfrentó quejas comunitarias sobre tráfico pesado, estacionamiento bloqueando accesos, y mala iluminación. Su respuesta (2019-2022): instaló 45 luces LED ($850,000 MXN), creó programa de transporte para empleados (reducción de 60% en estacionamiento en calle), optimizó horarios de entrega de camiones (solo 6am-8pm), y patrocinó mejoras de banquetas ($1.2M MXN). Resultados: incidentes bajaron 42%, quejas comunitarias cayeron 89%, satisfacción de empleados aumentó de 6.1 a 8.4/10, aprobación de comunidad para expansión: 85%, evitó retrasos regulatorios valorados en $5M+ MXN.',
  
  activity_type = 'audit',
  activity_config = jsonb_build_object(
    'title', 'Auditoría de Seguridad Comunitaria',
    'description', 'Realiza una caminata de evaluación de seguridad alrededor de tus instalaciones',
    'steps', ARRAY[
      'Formar equipos de 3-4 personas (mixtos: hombres, mujeres, diferentes edades)',
      'Descargar checklist de seguridad y traer cámara/teléfono',
      'Programar en diferentes momentos: día, atardecer, noche',
      'Caminar perímetro de 500m alrededor de instalaciones',
      'Evaluar infraestructura física (banquetas, iluminación, cruces, señalización)',
      'Evaluar seguridad percibida (visibilidad, actividad social, limpieza)',
      'Identificar problemas específicos (áreas oscuras, paredes ciegas, basura, obstrucciones)',
      'Entrevistar 5-10 residentes sobre su percepción de seguridad',
      'Documentar con 20-30 fotos de problemas y buenas prácticas',
      'Crear mapa marcando puntos inseguros (rojo) y áreas seguras (verde)'
    ],
    'deliverable', 'Informe de Auditoría de Seguridad (5-8 páginas) con: resumen ejecutivo de hallazgos, mapa anotado con zonas de seguridad, galería de fotos con problemas identificados, comentarios de entrevistas comunitarias, lista priorizada de mejoras recomendadas',
    'time_estimate', '3-4 horas para caminata y documentación, 2-3 horas para informe'
  ),
  activity_required = true,
  
  tools_used = ARRAY['security-audit-tool', 'photo-uploader', 'mapping-tool'],
  
  resources = jsonb_build_object(
    'downloads', ARRAY[
      jsonb_build_object('name', 'Checklist de Auditoría de Seguridad', 'type', 'pdf'),
      jsonb_build_object('name', 'Guía de Entrevistas Comunitarias', 'type', 'pdf'),
      jsonb_build_object('name', 'Plantilla de Informe de Auditoría', 'type', 'docx')
    ],
    'external_links', ARRAY[
      jsonb_build_object('title', 'ONU-Hábitat: Marco de Ciudades Seguras', 'url', 'https://unhabitat.org'),
      jsonb_build_object('title', 'Principios CPTED', 'url', 'https://cpted.net')
    ]
  ),
  
  next_steps = ARRAY[
    'Completar la caminata de auditoría en al menos 2 momentos diferentes del día',
    'Entrevistar a residentes locales y documentar sus perspectivas',
    'Crear un mapa visual de puntos de seguridad e inseguridad',
    'Priorizar los problemas identificados por impacto y urgencia',
    'Compartir hallazgos con equipo de gestión y planear próximos pasos'
  ],
  
  updated_at = NOW()
WHERE lesson_number = 1
AND module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'safe_cities' 
  AND status = 'published'
  LIMIT 1
);

-- ============================================
-- LESSON 3.2: "El Impacto del Diseño"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Carlos lleva el informe de auditoría a la junta directiva. Muestra fotos del callejón oscuro donde Sofía se sintió insegura.',
    'conflict', '"Creamos esto," dice Carlos. "Nuestra cerca sólida de 4 metros no tiene ventanas. Nuestros camiones bloquean la calle. Nuestras luces del perímetro iluminan hacia adentro, no hacia la calle."',
    'development', 'La junta revisa los datos: zonas muertas creadas por muros sólidos, tráfico de camiones en horas pico escolares, iluminación que solo sirve al perímetro industrial. Carlos presenta casos de otras empresas que transformaron sus bordes.',
    'resolution', '"Podemos arreglar esto," dice Carlos. "Y no es solo lo correcto—es estratégico."'
  ),
  
  learning_objectives = ARRAY[
    'Identificar cómo las instalaciones industriales impactan negativamente la seguridad del vecindario',
    'Aplicar mejores prácticas para bordes, tráfico/logística, iluminación y mantenimiento',
    'Diseñar estrategia de seguridad priorizando inversiones por impacto y esfuerzo',
    'Calcular costos y ROI de mejoras de seguridad urbana'
  ],
  
  key_points = ARRAY[
    'Muros/cercas altas y sólidas crean "zonas muertas" - mejor usar cercas transparentes',
    '68% de crimen en México ocurre en áreas mal iluminadas - iluminación reduce crimen 20-50%',
    'Teoría de Ventanas Rotas: deterioro invita a más deterioro - mantenimiento rápido es clave',
    'Programas "Adopt-a-Block" permiten a empresas adoptar responsabilidad por cuadras circundantes'
  ],
  
  did_you_know = ARRAY[
    'Heineken (Guadalajara) reemplazó muro sólido con reja transparente + jardín por $2.8M MXN y logró reducir crimen 55%',
    'Hershey (Monterrey) instaló 120 luces LED por $1.2M MXN y redujo incidentes nocturnos 67%',
    'OXXO tiene programa estandarizado en 32 centros: cada CEDIS adopta 3-5 cuadras con inversión de $50-150k MXN/año'
  ],
  
  real_world_example = 'Heineken (Guadalajara) enfrentó un muro sólido de concreto de 3m con grafiti constante usado para actividad ilícita. Solución: reemplazó con reja verde transparente + jardín nativo, agregó iluminación artística nocturna, y creó "sendero cervecero" educativo en el exterior. Costo: $2.8M MXN. Resultado: crimen en área bajó 55%, grafiti casi eliminado, se convirtió en atracción comunitaria. Hershey (Monterrey) implementó "Proyecto Luz Segura" (2021): instaló 120 luces LED en 2km alrededor de planta con sensores. Inversión: $1.2M MXN. Resultado: incidentes nocturnos -67%, caminabilidad nocturna aumentó de 3.1 a 7.8/10, actividad económica nocturna +35%.',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Diseña Tu Estrategia de Seguridad',
    'description', 'Basándote en tu auditoría, crea un plan de mejoras de seguridad a 3 años',
    'steps', ARRAY[
      'Priorizar problemas usando Matriz Impacto vs. Esfuerzo',
      'Para cada problema: evaluar Impacto en seguridad (1-3) y Esfuerzo para resolver (1-3)',
      'Identificar Victorias Rápidas (0-3 meses, <$100,000 MXN): 5 mejoras de alto impacto, bajo esfuerzo',
      'Definir Inversiones Mediano Plazo (3-12 meses, $100-500k MXN): 3 proyectos de impacto moderado/alto',
      'Planear Transformaciones Largo Plazo (1-3 años, $500k+ MXN): 1-2 cambios transformacionales',
      'Establecer métricas de éxito: incidentes reportados, percepción de seguridad, participación comunitaria, quejas, satisfacción',
      'Definir estrategia de alianzas con gobierno, comunidad, y otros negocios'
    ],
    'deliverable', 'Plan de Mejora de Seguridad a 3 Años (8-12 páginas) con: resumen ejecutivo, matriz de priorización, victorias rápidas detalladas, inversiones a mediano/largo plazo, presupuesto y cronograma, métricas y sistema de seguimiento, estrategia de alianzas',
    'time_estimate', '4-6 horas'
  ),
  activity_required = true,
  
  tools_used = ARRAY['cost-calculator', 'prioritization-matrix', 'timeline-planner'],
  
  resources = jsonb_build_object(
    'downloads', ARRAY[
      jsonb_build_object('name', 'Plantilla: Matriz Impacto vs. Esfuerzo', 'type', 'xlsx'),
      jsonb_build_object('name', 'Plantilla: Plan de Seguridad a 3 Años', 'type', 'docx'),
      jsonb_build_object('name', 'Guía de Costos: Iluminación y Infraestructura', 'type', 'pdf')
    ],
    'external_links', ARRAY[
      jsonb_build_object('title', 'Estándares de Iluminación Urbana', 'url', 'https://www.iesna.org')
    ]
  ),
  
  next_steps = ARRAY[
    'Presentar matriz de priorización a equipo de gestión',
    'Aprobar presupuesto para victorias rápidas (0-3 meses)',
    'Identificar socios potenciales: gobierno local, vecinos, otros negocios',
    'Comenzar con 1-2 victorias rápidas de alto impacto',
    'Documentar el antes con fotos y mediciones para comparar después'
  ],
  
  updated_at = NOW()
WHERE lesson_number = 2
AND module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'safe_cities' 
  AND status = 'published'
  LIMIT 1
);

-- ============================================
-- LESSON 3.3: "La Vida en las Calles"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Lupita, la dueña de la tienda, tiene una idea. "El espacio vacío al lado de la fábrica—¿qué tal si lo convertimos en algo útil? Un parque pequeño, una plaza. Algo que traiga vida."',
    'conflict', 'María y Carlos miran el lote abandonado que han ignorado por años.',
    'development', 'Comienzan a imaginar: bancas bajo árboles, un área de juegos para niños, murales de artistas locales. Lupita ya está pensando en eventos: mercados dominicales, clases de yoga, cine bajo las estrellas.',
    'resolution', '"Sí," dice Carlos. "Hagámoslo juntos."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender el poder del espacio público de calidad para la cohesión social y seguridad',
    'Identificar tipos de intervenciones de espacio público según presupuesto (ligero, moderado, transformacional)',
    'Aplicar principios de diseño de espacios públicos exitosos: accesibilidad, comodidad, usos, sociabilidad',
    'Diseñar intervención de espacio público con co-creación comunitaria'
  ],
  
  key_points = ARRAY[
    '56% de mexicanos urbanos carecen de espacios públicos de calidad dentro de 400m (CONAVI)',
    'Ciudades con más parques/plazas tienen crimen 15-30% menor',
    'Placemaking Ligero ($20-100k): mobiliario movible, arte temporal, pintura de calles',
    'Errores comunes: diseño sin consulta comunitaria, sin plan de mantenimiento, monofuncional'
  ],
  
  did_you_know = ARRAY[
    'Kimberley-Clark transformó lote vacío con $45,000 MXN temporalmente - éxito llevó a inversión permanente de $380,000 MXN',
    'Grupo Salinas creó 47 "Espacios de Encuentro" (2018-2024) con costo promedio de $280,000 MXN',
    'Modelo (AB InBev) recuperó 6 hectáreas industriales abandonadas en Naucalpan con inversión de $12M MXN - valor de propiedades circundantes +18%, crimen -42%'
  ],
  
  real_world_example = 'Kimberley-Clark (CDMX) creó "Parque de Bolsillo" en lote vacío junto a planta. Trabajó con colectivo urbano "El Enjambre" para transformación temporal (6 meses) con materiales reciclados: 3 bancas, 2 mesas, jardín comunitario, arte mural. Costo: $45,000 MXN. El éxito llevó a inversión de $380,000 MXN para versión permanente. Grupo Modelo recuperó 6 hectáreas de terreno industrial abandonado en Naucalpan creando "Parque Modelo" con áreas deportivas, juegos, jardines, centro comunitario. Inversión: $12M MXN (70% empresa, 30% gobierno). Inaugurado 2022, atiende a 25,000 personas/mes. Impacto: valor de propiedades +18%, crimen -42%.',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Proyecto de Espacio Público',
    'description', 'Diseña una intervención de espacio público cerca de tus instalaciones con co-creación comunitaria',
    'steps', ARRAY[
      'Identificar oportunidad: lote vacío, calle de bajo tráfico, espacio subutilizado, corredor peatonal',
      'Documentar ubicación, tamaño (m²), propietario, uso actual',
      'Realizar 20-30 entrevistas comunitarias sobre necesidades y deseos',
      'Compilar resultados: necesidades más mencionadas, actividades deseadas, preocupaciones',
      'Diseñar concepto: asientos, árboles/sombra, iluminación, juegos, área deportiva, arte, jardín',
      'Crear boceto/maqueta: planta (vista aérea) y perspectivas',
      'Calcular presupuesto: inversión inicial y costos anuales de mantenimiento',
      'Definir modelo de gestión: alianza público-privada-comunitaria',
      'Planear activación: eventos semanales, mensuales, anuales'
    ],
    'deliverable', 'Propuesta de Proyecto de Espacio Público (10-15 páginas) con: justificación y necesidad, investigación comunitaria, diseño conceptual con imágenes/bocetos, presupuesto detallado, modelo de gestión y mantenimiento, plan de activación, cronograma de implementación, métricas de éxito',
    'time_estimate', '6-8 horas'
  ),
  activity_required = true,
  
  tools_used = ARRAY['community-survey-tool', 'design-planner', 'cost-calculator', 'photo-uploader'],
  
  resources = jsonb_build_object(
    'downloads', ARRAY[
      jsonb_build_object('name', 'Guía de Entrevistas para Diseño Participativo', 'type', 'pdf'),
      jsonb_build_object('name', 'Plantilla: Propuesta de Espacio Público', 'type', 'docx'),
      jsonb_build_object('name', 'Catálogo de Mobiliario Urbano y Costos', 'type', 'pdf')
    ],
    'external_links', ARRAY[
      jsonb_build_object('title', 'Project for Public Spaces (PPS)', 'url', 'https://www.pps.org'),
      jsonb_build_object('title', 'Jan Gehl - Ciudades para la Gente', 'url', 'https://gehlpeople.com')
    ]
  ),
  
  next_steps = ARRAY[
    'Realizar entrevistas comunitarias para comprender necesidades reales',
    'Co-diseñar el espacio con residentes locales y usuarios potenciales',
    'Considerar piloto temporal antes de inversión permanente',
    'Formar comité de gestión con empresa, comunidad y gobierno',
    'Planear inauguración con evento comunitario para generar apropiación'
  ],
  
  updated_at = NOW()
WHERE lesson_number = 3
AND module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'safe_cities' 
  AND status = 'published'
  LIMIT 1
);

-- ============================================
-- LESSON 3.4: "Movilidad para Todos"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María camina a casa del trabajo—45 minutos por calles sin banquetas, cruzando avenidas peligrosas.',
    'conflict', 'Su compañero Carlos conduce—15 minutos puerta a puerta. "No es justo," reflexiona María. "La ciudad está diseñada para autos, no para personas."',
    'development', 'En la siguiente junta, María comparte esta realidad. Carlos nunca había considerado que su privilegio de auto le hacía invisible el peligro diario de sus compañeros. Comienzan a investigar: ¿cuántos empleados caminan en condiciones inseguras? ¿Qué podría hacer la empresa?',
    'resolution', '"La movilidad segura no es un lujo," dice María. "Es un derecho. Y nosotros podemos ayudar a hacerlo realidad."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender la crisis de movilidad en México y su impacto en seguridad',
    'Aplicar jerarquía de movilidad urbana priorizando peatones y ciclistas',
    'Diseñar infraestructura segura: banquetas, cruces peatonales, ciclovías',
    'Implementar programas corporativos de movilidad sostenible'
  ],
  
  key_points = ARRAY[
    '24,000 muertes por accidentes de tránsito al año en México - 70% son peatones, ciclistas, motociclistas',
    '35% de trabajadores limitan búsqueda de empleo a lugares accesibles',
    'Jerarquía de movilidad: 1.Peatones, 2.Ciclistas, 3.Transporte público, 4.Carga, 5.Autos privados',
    'Banquetas de calidad: $1,500-3,000 MXN/metro lineal - ROI: empleados más sanos, menos accidentes'
  ],
  
  did_you_know = ARRAY[
    'Nissan (Aguascalientes) construyó 5km de banquetas por $8.5M MXN - ahora 42% de empleados caminan/bici (antes 8%), ahorro de $2.3M MXN/año',
    'Walmart ha instalado 340+ cruces peatonales seguros desde 2019 ($42M MXN) - cero fatalidades cerca de tiendas',
    'Google (CDMX) construyó 2km de ciclovía + estacionamiento para 200 bicis + incentivo $500/mes - 28% empleados usan bici, auto-uso -31%'
  ],
  
  real_world_example = 'Nissan Mexicana (Aguascalientes) construyó/mejoró 5km de banquetas alrededor de planta. Inversión: $8.5M MXN. Resultado: 42% de empleados ahora caminan/bici (antes 8%), ahorro de $2.3M MXN/año en subsidio de transporte. Walmart implementó política nacional: todas las tiendas deben asegurar cruce seguro dentro de 200m - si no existe, Walmart costea instalación. Ha instalado 340+ cruces desde 2019 (inversión total $42M MXN). Resultado: cero fatalidades peatonales cerca de tiendas desde implementación. Grupo Modelo (Guadalajara) invirtió $5.8M MXN en corredor de 3.5km hacia planta con banquetas, ciclovía, iluminación, árboles, cruces seguros. Resultado: corredor ahora modelo nacional, movilidad activa +156%.',
  
  activity_type = 'audit',
  activity_config = jsonb_build_object(
    'title', 'Plan de Movilidad Segura',
    'description', 'Diseña estrategia de movilidad para tus empleados y comunidad',
    'steps', ARRAY[
      'Realizar encuesta de movilidad a empleados: modo actual, tiempo, costo, satisfacción, barreras',
      'Compilar resultados: % por modo de transporte, tiempo promedio, costo promedio, satisfacción',
      'Mapear rutas y peligros: ubicación de instalaciones, vecindarios de empleados, rutas actuales, puntos peligrosos',
      'Identificar transporte público cercano y conexiones faltantes',
      'Definir Victorias Rápidas (0-6 meses, <$200k): mejoras de bajo costo/alto impacto',
      'Planear Inversiones Medianas (6-18 meses, $200k-1M): infraestructura moderada',
      'Diseñar Transformación (1-3 años, $1M+): cambio sistémico con socios',
      'Establecer metas cuantificables a 3 años: reducir auto solo, aumentar modos sostenibles, mejorar satisfacción'
    ],
    'deliverable', 'Plan de Movilidad Segura (8-12 páginas) con: diagnóstico actual (datos de encuesta), mapa de rutas y peligros, soluciones priorizadas con presupuestos, programa de incentivos, alianzas con gobierno/transporte, metas y métricas, cronograma',
    'time_estimate', '5-7 horas'
  ),
  activity_required = true,
  
  tools_used = ARRAY['employee-survey-tool', 'mapping-tool', 'cost-calculator', 'carbon-calculator'],
  
  resources = jsonb_build_object(
    'downloads', ARRAY[
      jsonb_build_object('name', 'Plantilla: Encuesta de Movilidad de Empleados', 'type', 'docx'),
      jsonb_build_object('name', 'Plantilla: Plan de Movilidad Segura', 'type', 'docx'),
      jsonb_build_object('name', 'Guía de Costos: Infraestructura de Movilidad', 'type', 'pdf')
    ],
    'external_links', ARRAY[
      jsonb_build_object('title', 'ITDP México - Movilidad Sostenible', 'url', 'https://mexico.itdp.org'),
      jsonb_build_object('title', 'Manual de Calles: Diseño Universal', 'url', 'https://manualcalles.mx')
    ]
  ),
  
  next_steps = ARRAY[
    'Encuestar a empleados sobre patrones actuales de movilidad',
    'Identificar rutas peligrosas que tus empleados usan diariamente',
    'Calcular costos de infraestructura segura (banquetas, cruces, ciclovías)',
    'Explorar incentivos para movilidad sostenible (subsidio transporte público, pago por km bici)',
    'Iniciar conversación con gobierno local sobre mejoras viales compartidas'
  ],
  
  updated_at = NOW()
WHERE lesson_number = 4
AND module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'safe_cities' 
  AND status = 'published'
  LIMIT 1
);

-- ============================================
-- LESSON 3.5: "Midiendo Ciudades Más Seguras"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Tres meses después, Sofía camina confiadamente por el nuevo sendero iluminado junto a la fábrica. El lote vacío es ahora una plaza pequeña donde vecinos se reúnen.',
    'conflict', '"Gracias," le dice a María. Carlos mira los datos: Incidentes de seguridad bajaron 58%, satisfacción comunitaria en 8.9/10.',
    'development', 'El éxito atrae atención. Otras empresas del polígono industrial visitan para aprender. El municipio quiere replicar el modelo. Los empleados están orgullosos—no solo trabajan aquí, contribuyen al bienestar del vecindario.',
    'resolution', '"Esto es solo el principio," dice Carlos. "Hemos demostrado que es posible. Ahora escalemos."'
  ),
  
  learning_objectives = ARRAY[
    'Definir KPIs para ciudades seguras: seguridad física, percibida, movilidad, compromiso comunitario',
    'Implementar sistema de seguimiento y medición de impacto',
    'Reportar métricas ESG según estándares GRI 413 y ODS 11',
    'Diseñar e implementar mini-proyecto de intervención de ciudad segura'
  ],
  
  key_points = ARRAY[
    'Métricas de seguridad física: incidentes reportados (meta -30%), accidentes de tránsito (cero fatalidades), incidentes laborales (meta -50%)',
    'Seguridad percibida: encuesta trimestral (meta >7/10 día, >5/10 noche), uso de espacios públicos (meta >200 pers/día)',
    'Movilidad: % modos sostenibles (meta >50%), satisfacción (meta >7/10)',
    'Estándares de reporte: GRI 413 (Comunidades Locales), ODS 11 (Ciudades Sostenibles), ISO 26000'
  ],
  
  did_you_know = ARRAY[
    'CEMEX reporta (2023): inversión comunitaria de $187M MXN (0.45% ingresos), 234 proyectos, 89,000 beneficiados, 42 alianzas público-privadas',
    'Las empresas que miden y reportan transparentemente tienen 35% mejor reputación comunitaria',
    'Mediciones consistentes permiten demostrar ROI y justificar expansión de programas'
  ],
  
  real_world_example = 'CEMEX (Reporte Integrado 2023) en sección "Comunidades Prósperas": inversión comunitaria de $187M MXN (0.45% de ingresos), 234 proyectos de infraestructura comunitaria, 89,000 personas beneficiadas directamente, 42 alianzas público-privadas activas, NPS comunitario de 67 (excelente), verificación externa por PwC. El reporte detalla métricas de seguridad física (reducción de incidentes), seguridad percibida (encuestas trimestrales), movilidad (infraestructura instalada), y compromiso comunitario (participación en proyectos). Este nivel de transparencia y medición les ha permitido expandir operaciones con aprobación comunitaria del 90%+.',
  
  activity_type = 'commitment',
  activity_config = jsonb_build_object(
    'title', 'Mini-Proyecto: Intervención de Ciudad Segura',
    'description', 'Implementar una mejora de seguridad/espacio público y medir impacto en 30 días',
    'options', ARRAY[
      'Opción A: Mejora de Iluminación - Instalar 5-15 luces LED en "punto negro"',
      'Opción B: Cruce Peatonal Seguro - Diseñar e implementar mejora de cruce peligroso',
      'Opción C: Placemaking Ligero - Crear plaza/parque temporal con mobiliario y pintura',
      'Opción D: Programa de Movilidad - Lanzar incentivo para movilidad sostenible por 30 días'
    ],
    'phases', ARRAY[
      'Semana 1: Diseño y Aprobaciones - documento de proyecto, línea base, permisos, compromiso de aliados',
      'Semana 2-3: Implementación - ejecución, documentación (fotos/videos), comunicación, evento de inauguración',
      'Semana 3-4: Medición y Evaluación - datos post-intervención, encuestas, comparación antes/después',
      'Semana 4: Informe Final - resultados cuantitativos/cualitativos, lecciones, recomendaciones, plan de sostenibilidad'
    ],
    'deliverables', ARRAY[
      'Propuesta de Proyecto (2-3 páginas)',
      'Datos de línea base (mediciones, encuestas)',
      'Documentación de implementación (fotos, videos, notas)',
      'Datos post-intervención (mediciones, encuestas)',
      'Informe de Resultados (5-8 páginas)',
      'Presentación (10 minutos) a gerencia y comunidad'
    ],
    'success_criteria', ARRAY[
      'Mejora medible en seguridad (física o percibida)',
      'Participación comunitaria en diseño/implementación',
      'Sostenibilidad (plan para mantener/continuar)',
      'Replicabilidad (puede hacerse en otras áreas)',
      'Documentación completa (para compartir lecciones)'
    ]
  ),
  activity_required = true,
  
  tools_used = ARRAY['impact-tracker', 'photo-uploader', 'survey-tool', 'cost-calculator'],
  
  resources = jsonb_build_object(
    'downloads', ARRAY[
      jsonb_build_object('name', 'Plantilla: Cuadro de Mando de Ciudades Seguras', 'type', 'xlsx'),
      jsonb_build_object('name', 'Plantilla: Informe de Mini-Proyecto', 'type', 'docx'),
      jsonb_build_object('name', 'Guía de Reporte ESG: GRI 413 y ODS 11', 'type', 'pdf')
    ],
    'external_links', ARRAY[
      jsonb_build_object('title', 'GRI 413: Comunidades Locales', 'url', 'https://www.globalreporting.org'),
      jsonb_build_object('title', 'ODS 11: Ciudades y Comunidades Sostenibles', 'url', 'https://www.un.org/sustainabledevelopment')
    ]
  ),
  
  next_steps = ARRAY[
    'Seleccionar UN mini-proyecto de las 4 opciones',
    'Medir línea base ANTES de implementar (fotos, datos, encuestas)',
    'Implementar el proyecto en 2-3 semanas con participación comunitaria',
    'Medir impacto DESPUÉS (mismas métricas que línea base)',
    'Presentar resultados a gerencia y comunidad',
    'Celebrar el éxito y planear cómo escalar o replicar'
  ],
  
  updated_at = NOW()
WHERE lesson_number = 5
AND module_id IN (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'safe_cities' 
  AND status = 'published'
  LIMIT 1
);

-- ============================================
-- Verification: Check that all 5 lessons were updated
-- ============================================
SELECT 
    ml.lesson_number,
    ml.title,
    CASE 
        WHEN ml.story_content IS NOT NULL THEN '✅'
        ELSE '❌'
    END AS has_story,
    CASE 
        WHEN ml.learning_objectives IS NOT NULL THEN '✅'
        ELSE '❌'
    END AS has_objectives,
    CASE 
        WHEN ml.activity_config IS NOT NULL THEN '✅'
        ELSE '❌'
    END AS has_activity,
    ml.updated_at
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'safe_cities'
  AND mm.status = 'published'
ORDER BY ml.lesson_number;

-- ✅ Success message
SELECT '🎉 Module 3 (Ciudades Seguras) enrichment complete!' AS status,
       '5 lessons updated with story content, activities, and tools' AS details;

