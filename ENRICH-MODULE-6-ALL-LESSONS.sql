-- ============================================
-- ENRICH MODULE 6: Integración de Impacto y Medición
-- All 5 Lessons - THE GRAND FINALE!
-- ============================================

-- NOTE: Using correct schema from Modules 2-5:
-- - Column name is 'lesson_order' NOT 'lesson_number'
-- - activity_config uses 'steps' (API maps to 'instructions')
-- - Following working pattern

-- ============================================
-- LESSON 6.1: "Contando lo que Cuenta"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Carlos distribuye seis meses de datos sobre la mesa de conferencias. María ayuda a organizarlos en categorías. Mejoras ambientales, ahorro de costos, proyectos comunitarios, compromiso de empleados.',
    'conflict', '"Esto es impresionante," dice el CEO, visitando desde las oficinas centrales. "¿Pero pueden convertir esto en un reporte que cuente la historia? Algo que podamos compartir con inversionistas, empleados y la comunidad?"',
    'development', 'Carlos y María trabajan para integrar todos los datos: reducción 31% emisiones, 30% menor consumo agua, 65% menos residuos a relleno, satisfacción empleados +40%, inversión comunitaria $2.1M.',
    'resolution', 'Crean reporte integral ESG mostrando no solo números, sino historias: Sofía caminando segura, jardín comunitario prosperando, empleados orgullosos. "Los números cuentan," dice María, "pero las historias conectan."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender marcos de reporte ESG (GRI, CDP, SASB, TCFD, ODS)',
    'Medir impacto en triple línea de fondo (económico, ambiental, social)',
    'Crear marco de historia de impacto integral',
    'Preparar datos para divulgación externa'
  ],
  
  key_points = ARRAY[
    'Triple línea de fondo: Ganancia (económico), Planeta (ambiental), Personas (social)',
    'Marcos principales: GRI (global estándar), CDP (inversionistas), SASB (industria-específico), TCFD (riesgo climático)',
    'ODS: 17 objetivos ONU, más relevantes para empresas ODS 6, 7, 8, 9, 11, 12, 13, 15',
    'Grupo Bimbo 2023: 31% reducción emisiones, 38% energía renovable, 36% mujeres en liderazgo',
    'Claves: Transparente (bueno y malo), Material (lo que importa), Comparable (métricas estándar), Verificado (terceros)'
  ],
  
  did_you_know = ARRAY[
    'Empresas en Dow Jones Sustainability Index superan mercado 2.3x en 10 años',
    '70% de inversionistas institucionales consideran factores ESG críticos en decisiones',
    'Grupo Bimbo: Reporte integrado verificado por KPMG, incluido en índices FTSE4Good y S&P Global',
    'Divulgación ESG correlaciona con menor costo de capital (0.6% puntos en promedio)'
  ],
  
  real_world_example = 'Grupo Bimbo Reporte Integrado 2023 - Estructura: Carta CEO, modelo negocio, estrategia sostenibilidad, datos desempeño (31% ↓ emisiones, 38% renovable, 135k empleados, +4.5% salario sobre inflación), compromiso stakeholders, aseguramiento KPMG. Resultado: Reconocimiento Dow Jones Sustainability Index, FTSE4Good, S&P Global. Demostró que reporte robusto atrae inversión y talento.',
  
  activity_type = 'reporting',
  activity_config = jsonb_build_object(
    'title', 'Marco de Tu Historia de Impacto',
    'description', 'Integrar todos los datos de Módulos 1-5 en marco de reporte ESG completo',
    'steps', ARRAY[
      'Recopilar datos Módulos 1-5: Energía/emisiones, agua, residuos, ciudades seguras, comercio justo',
      'Organizar por triple línea: Económico (ahorros, ROI), Ambiental (emisiones, agua, residuos), Social (empleados, comunidad)',
      'Calcular impactos clave: % de cambio vs. línea base, monetizar beneficios, identificar victorias',
      'Mapear a ODS: Para cada métrica, identificar cuál ODS apoya',
      'Seleccionar marco de reporte: GRI (completo), CDP (inversores), SASB (industria), o combinación',
      'Crear resumen ejecutivo: 1 página con highlights, gráficos impactantes, principales logros',
      'Desarrollar narrativa: Historia de transformación, desafíos superados, personas impactadas',
      'Preparar visualizaciones: Infografías, gráficos de tendencia, comparaciones antes/después'
    ],
    'deliverable', 'Reporte Integrado de Impacto (15-25 páginas) con: resumen ejecutivo, datos por categoría (ambiental/social/económico), mapeo ODS, narrativa de transformación, visualizaciones, testimonios stakeholders, metas futuras, marco de medición continua',
    'time_estimate', '6-8 horas',
    'tools_needed', ARRAY['Excel/Sheets', 'PowerBI/Tableau', 'Template reporte ESG']
  ),
  activity_required = true,
  
  tools_used = ARRAY['impact-dashboard', 'esg-reporter', 'sdg-mapper'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'GRI Standards',
        'url', 'https://www.globalreporting.org',
        'description', 'Estándar global de reporte de sostenibilidad'
      ),
      jsonb_build_object(
        'title', 'ODS ONU',
        'url', 'https://sdgs.un.org',
        'description', '17 Objetivos de Desarrollo Sostenible'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Recopilar TODOS los datos de Módulos 1-5',
    'Organizar en tabla integral (económico/ambiental/social)',
    'Calcular métricas clave y % de cambio',
    'Mapear logros a ODS relevantes',
    'Crear primer borrador de reporte integrado'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 1;

-- ============================================
-- LESSON 6.2: "Visualizando el Impacto"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María imprime el reporte de 30 páginas. Está lleno de tablas y números. "Es completo," dice, "pero ¿quién lo va a leer?" Carlos sugiere: "Necesitamos hacer esto visual. Una imagen vale más que mil palabras—o mil números."',
    'conflict', 'El equipo no tiene diseñador. El presupuesto es limitado. "¿Cómo hacemos esto profesional sin gastar una fortuna?" pregunta María.',
    'development', 'Descubren herramientas gratuitas: Canva para infografías, Google Data Studio para dashboards, incluso Excel puede crear gráficos impactantes con el diseño correcto.',
    'resolution', 'Crean dashboard interactivo y infografías compartibles. El CEO las comparte en LinkedIn. 15,000 views en 48 horas. Clientes potenciales contactan: "Queremos trabajar con empresas como ustedes."'
  ),
  
  learning_objectives = ARRAY[
    'Diseñar visualizaciones de datos efectivas (gráficos, infografías, dashboards)',
    'Usar herramientas gratuitas/asequibles para crear contenido visual',
    'Comunicar impacto complejo de forma simple y atractiva',
    'Adaptar visualizaciones para diferentes audiencias (inversores, empleados, comunidad)'
  ],
  
  key_points = ARRAY[
    'Visualización > Tablas: Cerebro procesa imágenes 60,000x más rápido que texto',
    'Tipos de gráficos: Barras (comparar), Líneas (tendencias), Pastel (proporciones), Mapas (geografía), Sankey (flujos)',
    'Herramientas gratuitas: Canva (infografías), Google Data Studio (dashboards), Flourish (interactivos), Excel/Sheets (básico)',
    'Regla 5-5-5: No más de 5 puntos de datos, 5 colores, 5 palabras por elemento',
    'Audiencias: Inversores (ROI, riesgo), Empleados (progreso, orgullo), Comunidad (impacto local, transparencia)'
  ],
  
  did_you_know = ARRAY[
    'Presentaciones con visuales son 43% más persuasivas que solo texto (estudio MIT)',
    'Dashboard interactivo aumenta engagement 5x vs. reporte estático',
    'Patagonia: Infografía de impacto compartida 50k+ veces en redes sociales',
    'Color importa: Verde (positivo), Rojo (negativo), Azul (confianza), Naranja (energía)'
  ],
  
  real_world_example = 'Patagonia "Environmental and Social Footprint" - Dashboard interactivo web mostrando: reducción 35% emisiones (gráfico línea), 90% algodón orgánico (pastel), mapa de fábricas con auditorías (geo), impacto hídrico por prenda (Sankey). Diseño limpio, colores consistentes, explicaciones simples. Resultado: 1M+ visitas/año, compartido masivamente en redes, atrae consumidores conscientes dispuestos a pagar premium.',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Dashboard de Impacto y Visualizaciones',
    'description', 'Crear dashboard interactivo y conjunto de visualizaciones compartibles',
    'steps', ARRAY[
      'Identificar audiencias: Inversores, empleados, clientes, comunidad - ¿qué le importa a cada uno?',
      'Seleccionar métricas clave: Top 10-15 más impactantes para visualizar',
      'Elegir tipos de gráfico: Para cada métrica, seleccionar formato óptimo (barras, líneas, pastel, etc.)',
      'Crear dashboard interno: Google Data Studio o Power BI, actualizado en tiempo real',
      'Diseñar infografías: Canva o similar, 1 página resúmenes compartibles',
      'Desarrollar presentación ejecutiva: 10-15 slides con visuales impactantes',
      'Probar con audiencia: Mostrar a 5-10 personas de cada grupo, obtener feedback',
      'Iterar y pulir: Simplificar, aclarar, mejorar basado en feedback'
    ],
    'deliverable', 'Paquete de Visualizaciones de Impacto: Dashboard interactivo (web), 3-5 infografías de 1 página (compartibles), presentación ejecutiva (15 slides), guía de uso (cómo compartir, interpretar)',
    'time_estimate', '5-7 horas',
    'tools_needed', ARRAY['Canva/PowerPoint', 'Google Data Studio/Tableau', 'Datos organizados']
  ),
  activity_required = true,
  
  tools_used = ARRAY['dashboard-builder', 'infographic-maker', 'chart-generator'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Canva (gratuito)',
        'url', 'https://www.canva.com',
        'description', 'Herramienta diseño infografías'
      ),
      jsonb_build_object(
        'title', 'Google Data Studio (gratuito)',
        'url', 'https://datastudio.google.com',
        'description', 'Dashboards interactivos'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Identificar top 10-15 métricas más impactantes',
    'Crear dashboard básico en Google Data Studio',
    'Diseñar 1-2 infografías piloto en Canva',
    'Probar con muestra de cada audiencia',
    'Iterar basado en feedback'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 2;

-- ============================================
-- LESSON 6.3: "Contando Tu Historia"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'El equipo presenta el reporte al consejo. Números impresionantes, gráficos hermosos. Pero algo falta. El CFO pregunta: "¿Por qué empezaron este viaje? ¿Qué los motivó?"',
    'conflict', 'María comparte: "Mi hija. Su asma. Sabíamos que algo tenía que cambiar." Silencio. Luego: "Esa es la historia. No los números. La niña que ahora respira mejor. ESO es lo que la gente recordará."',
    'development', 'Reescriben el reporte. Empiezan con historias: María y su hija, Sofía caminando segura, Don Roberto orgulloso del jardín. Los números apoyan las historias, no al revés.',
    'resolution', 'Publican el reporte con video testimonial. Empleados lloran al verlo. Clientes escriben: "Por esto compramos de ustedes." Competidores preguntan: "¿Cómo lo hicieron?"'
  ),
  
  learning_objectives = ARRAY[
    'Dominar arte de storytelling para comunicar impacto',
    'Estructurar narrativa de transformación (problema→acción→impacto)',
    'Incorporar testimonios y casos humanos',
    'Adaptar historia para diferentes canales (web, video, presentaciones, redes)'
  ],
  
  key_points = ARRAY[
    'Estructura narrativa: Problema (status quo), Acción (lo que hicieron), Impacto (resultados), Futuro (hacia dónde van)',
    'Héroe de la historia: NO es la empresa, son las PERSONAS (empleados, comunidad, planeta)',
    'Datos apoyan, no dominan: 80% historia, 20% números. No al revés',
    'Formatos: Video (más engagement), Blog posts (SEO), Redes sociales (alcance), Presentaciones (decisores)',
    'Autenticidad > Perfección: Mostrar desafíos y fracasos también. Humaniza'
  ],
  
  did_you_know = ARRAY[
    'Video testimonial genera 12x más engagement que texto (estudio HubSpot)',
    'Storytelling aumenta retención mensaje 22x vs. solo hechos (Stanford)',
    'TOMS Shoes: Historia "One for One" generó $500M+ ventas sin publicidad tradicional',
    'B Corps reportan 3.5x más aplicantes laborales citando misión como razón #1'
  ],
  
  real_world_example = 'TOMS Shoes - Historia "One for One": Blake Mycoskie viajó a Argentina, vio niños sin zapatos. Decidió: por cada par vendido, dona uno. No solo vendían zapatos, vendían IMPACTO. Resultado: $500M+ ventas primeros 10 años sin publicidad tradicional, base de clientes fanáticos, movimiento global. Lección: Historia auténtica > marketing tradicional.',
  
  activity_type = 'content',
  activity_config = jsonb_build_object(
    'title', 'Tu Historia de Impacto',
    'description', 'Desarrollar narrativa completa de transformación con múltiples formatos',
    'steps', ARRAY[
      'Identificar "héroe": ¿Quién es persona/comunidad transformada? (María, Sofía, empleados, etc.)',
      'Definir "problema": ¿Cuál era status quo? ¿Por qué era insostenible?',
      'Mapear "acción": ¿Qué hicieron específicamente? (Módulos 1-5)',
      'Documentar "impacto": ¿Qué cambió? Datos + testimonios',
      'Proyectar "futuro": ¿Hacia dónde van ahora?',
      'Escribir narrativa: 500-1000 palabras, estructura clara, lenguaje accesible',
      'Recolectar testimonios: Entrevistas con 3-5 personas impactadas',
      'Crear multimedia: Video corto (2-3 min), infografía, galería fotos',
      'Adaptar para canales: Versión web, versión LinkedIn, versión presentación'
    ],
    'deliverable', 'Paquete de Storytelling: Narrativa escrita (1000 palabras), video testimonial (2-3 min), 3-5 testimonios escritos, galería de fotos antes/después, versión adaptada para web/redes/presentaciones',
    'time_estimate', '6-8 horas',
    'tools_needed', ARRAY['Cámara/teléfono', 'Editor video simple', 'Template historia']
  ),
  activity_required = true,
  
  tools_used = ARRAY['story-builder', 'video-editor', 'testimonial-collector'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'TED: El Arte del Storytelling',
        'url', 'https://www.ted.com',
        'description', 'Charlas sobre narrativa efectiva'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Identificar 3-5 personas para testimonios',
    'Escribir primer borrador de narrativa (500 palabras)',
    'Grabar 1-2 testimonios en video',
    'Recolectar fotos antes/después',
    'Crear versión de historia para LinkedIn'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 3;

-- ============================================
-- LESSON 6.4: "El Arte de la Celebración"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Han trabajado seis meses. Logros impresionantes. Pero el equipo está agotado. Carlos nota: "Hemos estado tan enfocados en la próxima meta que olvidamos celebrar cuánto hemos logrado."',
    'conflict', 'María está de acuerdo. "Merecemos una pausa. No solo para nosotros, sino para reconocer a TODOS los que contribuyeron."',
    'development', 'Organizan "Celebración de Impacto": Invitan a empleados, proveedores, comunidad. Muestran video de transformación. Dan premios de reconocimiento. Plantan árbol ceremonial.',
    'resolution', 'Don Roberto llora cuando lo reconocen como "Campeón Comunitario". Sofía corta el listón del nuevo jardín. María abraza a su hija. "Esto," dice Carlos, "es por lo que hicimos todo." El trabajo continúa, pero ahora saben: celebrar el progreso es tan importante como perseguir la perfección.'
  ),
  
  learning_objectives = ARRAY[
    'Comprender importancia de celebración y reconocimiento',
    'Diseñar eventos de celebración inclusivos (empleados, proveedores, comunidad)',
    'Crear programas de reconocimiento continuo',
    'Usar celebración como herramienta de motivación y cultura'
  ],
  
  key_points = ARRAY[
    'Celebración ≠ Lujo, es NECESIDAD: Refuerza comportamiento positivo, motiva continuación, construye cultura',
    'Reconocimiento: Público (ceremonias, premios), Privado (notas, conversaciones), Tangible (bonos, regalos), Intangible (tiempo libre, flexibilidad)',
    'Incluir a TODOS: Empleados, proveedores, comunidad, familias. Nadie es demasiado pequeño para reconocer',
    'Hacer memorable: Fotos, videos, certificados, símbolos físicos (árbol, placa, mural)',
    'Frecuencia: Grandes celebraciones (anual), pequeñas (trimestral), reconocimientos (semanal)'
  ],
  
  did_you_know = ARRAY[
    'Empleados reconocidos mensualmente son 5x más productivos y 3x menos propensos a renunciar (Gallup)',
    'Zappos gasta $50k/año en celebraciones, considera ROI 10:1 en retención',
    'Google "Peer Bonus": Empleados pueden dar $175 a compañeros por contribución, distribuye $10M+/año',
    'Celebración activa dopamina (placer) y oxitocina (conexión) - ambas mejoran teamwork'
  ],
  
  real_world_example = 'Zappos "Culture Book" - Celebración anual: 365 páginas con contribuciones de CADA empleado sobre cultura. CEO lee selecciones, da premios creativos (más creativo, más inspirador, mejor vestido). Incluye familias en fiesta. Costo $50k, resultado: Rotación 10% (vs. 40% industria), productividad top 5%, empleados embajadores de marca. ROI 10:1 en retención.',
  
  activity_type = 'event',
  activity_config = jsonb_build_object(
    'title', 'Celebración de Impacto y Programa de Reconocimiento',
    'description', 'Diseñar evento de celebración de impacto y programa de reconocimiento continuo',
    'steps', ARRAY[
      'Definir qué celebrar: Top 10 logros de Módulos 1-5',
      'Identificar campeones: 10-20 personas que contribuyeron más (diversos roles)',
      'Diseñar evento: Formato (presencial/híbrido), duración (2-3 horas), elementos (video, premios, comida, actividad)',
      'Preparar materiales: Video de transformación (5 min), certificados de reconocimiento, premios/símbolos',
      'Invitar stakeholders: Empleados + familias, proveedores clave, representantes comunidad',
      'Crear programa: Agenda clara (bienvenida, video, reconocimientos, actividad simbólica, comida)',
      'Documentar: Fotos, videos, testimonios para compartir después',
      'Programa continuo: Sistema de reconocimiento semanal/mensual para mantener momentum'
    ],
    'deliverable', 'Plan de Celebración (8-10 páginas) con: lista de logros a celebrar, campeones a reconocer, diseño de evento (agenda, presupuesto, invitados), materiales (video, certificados), programa de reconocimiento continuo, plan de documentación',
    'time_estimate', '4-6 horas',
    'tools_needed', ARRAY['Presupuesto evento', 'Lista invitados', 'Materiales reconocimiento']
  ),
  activity_required = true,
  
  tools_used = ARRAY['event-planner', 'recognition-tracker', 'certificate-maker'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Gallup: Estado del Lugar de Trabajo',
        'url', 'https://www.gallup.com',
        'description', 'Investigación sobre reconocimiento y engagement'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Listar top 10 logros de 6 meses',
    'Identificar 10-20 campeones para reconocer',
    'Definir fecha y formato de celebración',
    'Presupuestar evento (realista)',
    'Comenzar sistema de reconocimiento semanal'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 4;

-- ============================================
-- LESSON 6.5: "Mejora Continua"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Después de la celebración, el equipo se reúne. "Logramos mucho," dice Carlos, "pero esto no se detiene aquí. Ahora viene la parte más difícil: mantener el momentum y seguir mejorando."',
    'conflict', 'María pregunta: "¿Cómo evitamos que esto se convierta en solo un proyecto que hicimos una vez? ¿Cómo lo hacemos parte de quiénes somos?"',
    'development', 'Deciden institucionalizar: Reuniones mensuales de impacto, dashboard permanente, metas anuales revisadas trimestralmente, bonos vinculados a KPIs de sostenibilidad, nuevos empleados capacitados desde día 1.',
    'resolution', 'Un año después: Crowd Conscious certifica B Corp, gana premio de sostenibilidad estatal, aparece en caso de estudio universitario. Pero lo más importante: Don Roberto visita la fábrica con su nieta. "¿Ven ese árbol?" señala al árbol ceremonial. "Lo plantamos juntos. Y miren cuánto creció." Como el árbol, como la empresa, como la comunidad. Juntos, crecen.'
  ),
  
  learning_objectives = ARRAY[
    'Establecer sistemas de mejora continua (PDCA, Kaizen)',
    'Integrar sostenibilidad en operaciones diarias',
    'Crear metas a largo plazo con revisiones regulares',
    'Construir cultura de mejora permanente'
  ],
  
  key_points = ARRAY[
    'Ciclo PDCA: Planear (metas), Hacer (implementar), Verificar (medir), Actuar (ajustar) - repetir infinitamente',
    'Kaizen: Mejora continua pequeña pero constante > cambio radical ocasional',
    'Institucionalizar: Reuniones regulares, dashboards permanentes, compensación vinculada, capacitación continua',
    'Metas SMART: Específicas, Medibles, Alcanzables, Relevantes, con Tiempo definido',
    'Celebrar progreso, no perfección: 1% mejor cada mes = 12.7x mejor en año (compounding)'
  ],
  
  did_you_know = ARRAY[
    'Toyota: Sistema Kaizen generó 1 millón+ ideas de empleados, 95% implementadas, ahorro $230M/año',
    'Mejora 1% diario = 37x mejor en un año (1.01^365 = 37.78) - poder del compounding',
    'Empresas con cultura mejora continua crecen 3.2x más rápido (estudio McKinsey)',
    'Patagonia: Meta "Climate Neutral 2025" revisada trimestralmente, ajustada basado en progreso real'
  ],
  
  real_world_example = 'Toyota Kaizen - Sistema de mejora continua: CADA empleado envía sugerencias de mejora, 95% son evaluadas e implementadas. Reuniones diarias de 15 min por equipo para revisar progreso y problemas. Dashboard visible en tiempo real. Resultado: 1M+ ideas/año implementadas, ahorro $230M USD/año, empleados altamente engaged (sienten escuchados), líder mundial en eficiencia. Lección: Mejora continua pequeña > cambio radical ocasional.',
  
  activity_type = 'planning',
  activity_config = jsonb_build_object(
    'title', 'Plan de Mejora Continua 3 Años',
    'description', 'Crear sistema de mejora continua y metas a largo plazo',
    'steps', ARRAY[
      'Revisar logros 6 meses: ¿Qué funcionó? ¿Qué no? ¿Qué aprendimos?',
      'Establecer visión 3 años: ¿Dónde queremos estar? (ambicioso pero realista)',
      'Definir metas anuales: Año 1, 2, 3 - específicas, medibles, alcanzables',
      'Crear metas trimestrales: Desglosar anuales en hitos trimestrales',
      'Institucionalizar: Reuniones mensuales impacto, dashboard permanente, revisiones trimestrales',
      'Vincular compensación: Bonos/incrementos parcialmente basados en KPIs sostenibilidad',
      'Capacitación continua: Nuevos empleados, refrescos anuales, compartir mejores prácticas',
      'Sistema de sugerencias: Canal para que TODOS propongan mejoras, proceso de evaluación rápida'
    ],
    'deliverable', 'Plan Estratégico de Mejora Continua (12-15 páginas) con: revisión logros 6 meses, visión 3 años, metas anuales y trimestrales, sistema de reuniones/revisiones, propuesta de compensación vinculada, plan de capacitación, sistema de sugerencias',
    'time_estimate', '5-7 horas',
    'tools_needed', ARRAY['Template plan estratégico', 'Sistema tracking metas', 'Calculadora metas']
  ),
  activity_required = true,
  
  tools_used = ARRAY['goal-tracker', 'improvement-planner', 'kaizen-board'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Toyota Kaizen Institute',
        'url', 'https://www.kaizen.com',
        'description', 'Metodología de mejora continua'
      ),
      jsonb_build_object(
        'title', 'B Corp: Mejores Prácticas',
        'url', 'https://www.bcorporation.net',
        'description', 'Casos de estudio de mejora continua'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Revisar y documentar lecciones de 6 meses',
    'Definir visión de impacto a 3 años',
    'Establecer metas anuales (Año 1, 2, 3)',
    'Crear calendario de reuniones mensuales',
    'Diseñar sistema de sugerencias de mejora'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'impact_integration' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 5;

-- ============================================
-- Verification: Check that all 5 lessons were updated
-- ============================================
SELECT 
    ml.lesson_order,
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
WHERE mm.core_value = 'impact_integration'
  AND mm.status = 'published'
ORDER BY ml.lesson_order;

-- ✅ Success message
SELECT '🎉🎉🎉 Module 6 (Integración de Impacto y Medición) enrichment complete!' AS status,
       '5 lessons updated - ALL 6 MODULES NOW COMPLETE!' AS details,
       '🌟 The full learning journey is ready for students!' AS celebration;

