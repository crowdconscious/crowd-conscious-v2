-- ============================================
-- ENRICH MODULE 4: Economía Circular - Cero Residuos
-- All 5 Lessons
-- ============================================

-- NOTE: Using correct schema:
-- - Column name is 'lesson_order' NOT 'lesson_number'
-- - activity_config uses 'steps' NOT 'instructions' (API maps it)
-- - Following Module 2 pattern which works correctly

-- ============================================
-- LESSON 4.1: "El Costo Verdadero de los Residuos"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Carlos mira fijamente la factura: $50,000 MXN por mes en disposición de residuos. Mientras tanto, Lupita está en la puerta de la fábrica, preguntando si tienen cajas de cartón sobrantes. "Tengo que comprarlas para mi tienda," dice. "Pero los veo tirar pilas todos los días."',
    'conflict', 'María conecta los puntos: "El desperdicio de una persona es el recurso de otra. ¿Y si dejamos de ver la basura como basura?"',
    'development', 'Carlos pide al equipo rastrear cada flujo de residuos durante una semana. Están sorprendidos: 8 toneladas de cartón, 2 toneladas de plástico de envoltura, 1.5 toneladas de desperdicio de alimentos de la cafetería, 500kg de chatarra metálica y docenas de tarimas rotas.',
    'resolution', '"Literalmente estamos tirando dinero," se da cuenta María. "Y llenando el relleno sanitario mientras lo hacemos."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender la crisis global de residuos y su impacto económico',
    'Calcular el costo verdadero de los residuos (directo, oculto, ingresos perdidos)',
    'Entender los principios de economía circular vs. economía lineal',
    'Realizar auditoría de flujos de residuos y análisis de valor'
  ],
  
  key_points = ARRAY[
    'México genera 120,000 toneladas de residuos al día - solo 9.6% reciclado',
    'Residuos industriales son 30% del total pero más valiosos (flujos concentrados)',
    'El costo real incluye: disposición, materiales comprados que se vuelven residuos, y valor de reciclables perdido',
    'Cartón vale $500-800/ton, aluminio $15-20k/ton, plástico $2-4k/ton - ¡págas para tirarlo!',
    'Economía circular: 3 principios - Eliminar residuos desde diseño, Mantener materiales en uso, Regenerar sistemas'
  ],
  
  did_you_know = ARRAY[
    'Valor económico de reciclables desperdiciados globalmente: $600 mil millones USD/año',
    'Crisis CDMX 2021: cuando cerró Bordo Poniente, reciclaje aumentó 40% en 6 meses - teníamos capacidad!',
    'Interface Carpets logró 95% desviación de relleno y ahorró $450M USD con economía circular',
    'Una fábrica típica puede convertir $45k/mes de costo en residuos a $4.5k/mes de ganancia con separación'
  ],
  
  real_world_example = 'Fábrica ABC - Estado Actual: Paga $45,000 MXN/mes por disposición de 12 toneladas de residuos mixtos. Dentro: 4 ton cartón (valor $3,200), 0.5 ton aluminio (valor $8,750), 2 ton plástico (valor $4,000), 1 ton metal (valor $3,500) = $19,450 MXN/mes tirados. Con separación: Paga $15,000/mes por 4.5 ton residuales, VENDE reciclables por $19,450/mes = +$4,450/mes de ganancia vs. $45,000 de costo. Impacto anual: $593,400 MXN de cambio.',
  
  activity_type = 'audit',
  activity_config = jsonb_build_object(
    'title', 'Auditoría de Flujos de Residuos',
    'description', 'Mapear y cuantificar cada flujo de residuos en tu instalación durante una semana completa',
    'steps', ARRAY[
      'Preparación (1 semana antes): Conseguir báscu las, contenedores etiquetados, hojas de registro, cámara, equipo de seguridad',
      'Periodo de auditoría (1 semana completa): Segregar y pesar todos los residuos por categoría',
      'Categorías: Reciclables (cartón, papel, plásticos, vidrio, aluminio, metal), Orgánicos (alimentos, jardín), Especiales (madera, textiles, electrónicos), Residuales, Peligrosos',
      'Análisis de composición: Calcular porcentajes, estimar totales anuales',
      'Análisis de valor: Para cada reciclable, calcular valor potencial (ton/año × precio/ton)',
      'Análisis de costos: Costo actual vs. costo potencial con separación',
      'Mapear generación: Crear mapa de instalación mostrando dónde se genera cada tipo',
      'Identificar oportunidades de prevención por área'
    ],
    'deliverable', 'Informe de Auditoría de Residuos (10-15 páginas) con: resumen ejecutivo con hallazgos clave, datos detallados por categoría, gráficos de composición (pastel/barras), análisis de valor económico, mapa de generación de residuos, fotos de flujos principales, recomendaciones priorizadas',
    'time_estimate', '8-10 horas (distribuidas en 1 semana)',
    'tools_needed', ARRAY['Básculas (50-500kg)', 'Contenedores etiquetados', 'Hojas de registro', 'Cámara', 'EPP']
  ),
  activity_required = true,
  
  tools_used = ARRAY['waste-audit-tool', 'value-calculator', 'photo-uploader'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Ellen MacArthur Foundation - Economía Circular',
        'url', 'https://ellenmacarthurfoundation.org',
        'description', 'Recursos y casos de estudio de economía circular'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Completar auditoría de residuos de una semana completa',
    'Calcular valor económico de reciclables actuales',
    'Identificar top 5 flujos por volumen y valor',
    'Fotografiar flujos principales para documentación',
    'Preparar presentación de hallazgos para gerencia'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'zero_waste' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 1;

-- ============================================
-- LESSON 4.2: "Cerrando el Círculo"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María habla con Lupita. "Necesitas cartón, nosotros tenemos toneladas. Don Roberto necesita composta para su jardín, nosotros tiramos restos de comida. ¿Y si creamos un sistema?"',
    'conflict', 'Lupita sonríe. "El desperdicio de uno es el tesoro de otro. Hagámoslo."',
    'development', 'El equipo comienza a investigar soluciones: programas de empaque retornable con proveedores, reparación de tarimas en lugar de desecharlas, compostaje de orgánicos, y simbiosis industrial con negocios vecinos.',
    'resolution', 'Carlos presenta el plan: "Podemos reducir residuos 72% y convertir un gasto de $45k/mes en ganancia de $4.5k/mes. El ROI es inmediato."'
  ),
  
  learning_objectives = ARRAY[
    'Aplicar estrategias de prevención en la fuente y reducción',
    'Implementar programas de reutilización interna',
    'Diseñar sistemas de reciclaje y compostaje efectivos',
    'Crear alianzas de simbiosis industrial (waste-to-resource matching)'
  ],
  
  key_points = ARRAY[
    'Nivel 1 - Prevención: Optimizar compras, rediseñar procesos, capacitar empleados (mayor impacto, menor costo)',
    'Nivel 2 - Reutilización: Reparar tarimas ahorra $972k/año vs. comprar nuevas',
    'Nivel 3 - Reciclaje/Compostaje: Compostaje aeróbico <$50k setup, digestión anaeróbica $2-10M pero genera electricidad',
    'Nivel 4 - Simbiosis Industrial: Residuos de uno son materia prima de otro (ej: Kalundborg, Dinamarca)',
    'Grupo Modelo logró 95% desviación con capacitación intensiva y 2,000+ ideas de empleados'
  ],
  
  did_you_know = ARRAY[
    'Toyota Baja California redujo residuos de empaque 72% (1,200 ton/año) con empaques retornables - ahorro $3.2M MXN/año',
    'Grupo Bimbo Lerma: Biodigestor $8M MXN genera 120 MWh/mes (15% de consumo) + 200 ton/año composta - payback 2.9 años',
    'Parque Industrial Aguascalientes: Simbiosis entre 6 empresas desvió 8,500 ton/año y ahorró $12M MXN colectivamente',
    'Patagonia "Worn Wear" genera $50M USD/año reparando y revendiendo ropa usada - reducción 80% huella vs. nuevo'
  ],
  
  real_world_example = 'Grupo Modelo - Programa "Cerveza Sin Desperdicio": Meta cero residuos a relleno. Capacitación intensiva 8 horas/empleado, sistema de sugerencias con premios. Resultado: De 25% desviación a 95% en 3 años. Más de 2,000 ideas de empleados implementadas. ROI: Ahorros superaron inversión en capacitación 15x. Certificación TRUE Zero Waste lograda en 12 plantas.',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Matching de Residuos a Recursos (Simbiosis Industrial)',
    'description', 'Identificar oportunidades de simbiosis industrial y crear acuerdos waste-to-resource',
    'steps', ARRAY[
      'Inventario de residuos con valor: Para cada flujo evaluar cantidad, calidad, valor potencial, empresas que podrían usarlo',
      'Investigación de mercado: Para top 5 flujos buscar en Google "[material] recicladores [ciudad]"',
      'Contactar 3-5 empresas por flujo: Preguntar si compran, especificaciones de calidad, precio pagado, volumen mínimo, frecuencia, logística',
      'Análisis de viabilidad: Para cada material calcular escenario actual (costo) vs. propuesto (ingreso o ahorro)',
      'Calcular CAMBIO: $/mes mejora y % de reducción de costo',
      'Prueba piloto: Seleccionar 1-2 flujos más prometedores, negociar prueba 1-3 meses',
      'Documentar proceso, métricas (cantidad, calidad, satisfacción)',
      'Si exitoso: formalizar y escalar a otros flujos'
    ],
    'deliverable', 'Reporte de Oportunidades de Simbiosis (5-8 páginas) con: inventario de residuos valorizables, investigación de compradores potenciales, análisis financiero top 3 oportunidades, plan de piloto recomendado, contactos y próximos pasos',
    'time_estimate', '4-6 horas',
    'tools_needed', ARRAY['Teléfono para contactos', 'Hoja de cálculo', 'Báscula para pesar muestras']
  ),
  activity_required = true,
  
  tools_used = ARRAY['cost-calculator', 'roi-calculator', 'partner-directory'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Bolsa de Residuos Industrial (CANACINTRA)',
        'url', 'https://www.canacintra.org.mx',
        'description', 'Plataforma para encontrar compradores de residuos'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Crear inventario detallado de residuos con valor comercial',
    'Contactar 3-5 recicladoras locales para cada flujo principal',
    'Negociar precios y condiciones para prueba piloto',
    'Documentar costos actuales vs. ingresos/ahorros potenciales',
    'Presentar análisis de viabilidad a gerencia para aprobación'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'zero_waste' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 2;

-- ============================================
-- LESSON 4.3: "Diseño para Cero Residuos"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'El equipo de producción estudia cada producto. "¿Cómo podemos hacer esto sin generar tanto desperdicio?" pregunta María.',
    'conflict', 'Un ingeniero sugiere: "¿Y si cambiamos el diseño para usar retazos más pequeños? O mejor aún, ¿diseñamos el producto para ser reparado en lugar de desechado?"',
    'development', 'Comienzan a aplicar principios de diseño circular: productos durables, modulares, reparables, actualizables, desarmables, reciclables. Estudian casos como Victorinox (garantía de por vida), Fairphone (smartphone reparable), y Patagonia (modelo circular).',
    'resolution', 'Carlos presenta el rediseño: "No solo reduce residuos 60%, también mejora la calidad y reduce costos de garantía. Es un ganar-ganar-ganar."'
  ),
  
  learning_objectives = ARRAY[
    'Aplicar principios de diseño circular: longevidad, reparación, actualización, desarmado, reciclaje, biomimética',
    'Rediseñar productos existentes para minimizar residuos',
    'Evaluar modelos de Producto como Servicio (PaaS) vs. venta tradicional',
    'Realizar análisis de ciclo de vida simplificado'
  ],
  
  key_points = ARRAY[
    'Diseño para longevidad: Productos duraderos vs. obsolescencia programada (ej: Victorinox garantía de por vida)',
    'Diseño para reparación: Modular, desarmable, repuestos disponibles (ej: Fairphone - vida útil 5-7 años vs. 2-3 típicos)',
    'Diseño para reciclaje: Monomaterial cuando sea posible, fácilmente separable, materiales etiquetados',
    'Producto como Servicio: Empresa mantiene propiedad, cliente paga por uso (ej: Philips "Luz como Servicio")',
    'Método (productos limpieza): Botellas 100% recicladas + sistema recarga = 95% menos plástico virgen, ventas +400%'
  ],
  
  did_you_know = ARRAY[
    'Fairphone: Smartphone con 10 módulos reemplazables por usuario - reducción 50% residuos electrónicos',
    'Framework Laptop: CPU, RAM, almacenamiento actualizables - reducción 80% residuos vs. comprar nuevo',
    'Ecovative: Empaque de hongos (micelio) 100% biodegradable en 30 días - usado por Dell, IKEA',
    'Optimización de corte textil con software puede reducir desperdicio de 15% a 4% - ahorro enorme en tela'
  ],
  
  real_world_example = 'Método (productos de limpieza): Botellas 100% plástico reciclado post-consumo. Diseño permite máximo llenado (menos transporte). Sistema de recarga: botella dura años, compras refill. Resultado: 95% menos plástico virgen usado, crecimiento de ventas 400% en 5 años, premio de diseño sustentable. Costo inicial de rediseño: $2M USD. ROI: 18 meses.',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Rediseño Circular',
    'description', 'Aplicar principios circulares a un producto/proceso de tu empresa',
    'steps', ARRAY[
      'Seleccionar producto: Elige uno que genere residuos significativos, tenga potencial de mejora, sea estratégico',
      'Análisis de ciclo de vida: Mapear desde extracción hasta disposición - etapas, inputs, outputs, residuos, impactos',
      'Identificar oportunidades: ¿Dónde se generan más residuos? ¿Dónde se pierde más valor? ¿Qué podríamos cambiar?',
      'Generar ideas usando 6 principios: Longevidad, Reparación, Actualización, Desarmado, Reciclaje, Biomimética',
      'Evaluar cada idea: Viabilidad (1-5), Impacto (1-5)',
      'Desarrollar top 3 ideas: Descripción detallada, cambios requeridos, costo, reducción residuos, ahorro/ingreso, ROI, barreras',
      'Plan de implementación: ¿Cómo pilotear? ¿Qué recursos? ¿Qué timeline?',
      'Crear renderizados o bocetos del rediseño'
    ],
    'deliverable', 'Propuesta de Rediseño Circular (8-12 páginas) con: análisis de producto actual (ciclo de vida), matriz de oportunidades, top 3 ideas desarrolladas, análisis de viabilidad técnica y financiera, plan de implementación/piloto, renderizados o bocetos',
    'time_estimate', '6-8 horas',
    'tools_needed', ARRAY['Software de diseño (opcional)', 'Calculadora para ROI', 'Fotos de producto actual']
  ),
  activity_required = true,
  
  tools_used = ARRAY['lifecycle-mapper', 'design-tool', 'roi-calculator'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Ellen MacArthur Foundation - Circular Design Guide',
        'url', 'https://www.circulardesignguide.com',
        'description', 'Guía interactiva de diseño circular'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Seleccionar un producto estratégico para rediseño',
    'Mapear su ciclo de vida completo (extracción a disposición)',
    'Aplicar 6 principios de diseño circular para generar ideas',
    'Calcular ROI de las 3 mejores ideas',
    'Presentar propuesta a equipo de ingeniería/producto'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'zero_waste' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 3;

-- ============================================
-- LESSON 4.4: "Construyendo Cultura de Cero Residuos"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María nota resistencia. Algunos empleados siguen mezclando residuos. "Es que siempre lo hemos hecho así," dicen.',
    'conflict', 'Carlos entiende: La tecnología no es el problema, la cultura es.',
    'development', 'Lanzan un concurso: El equipo que más reduzca residuos gana un día libre pagado. Instalan dashboards visibles con métricas en tiempo real. Capacitan a "campeones verdes" en cada departamento. Celebran victorias, no castigan errores.',
    'resolution', 'De repente, todos están innovando. Las ideas fluyen. El buzón de sugerencias está lleno. "La cultura cambió," observa María. "Ahora todos somos dueños del problema."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender elementos de cultura de cero residuos: liderazgo, capacitación, comunicación, incentivos',
    'Diseñar programa de capacitación y cambio de comportamiento',
    'Implementar sistema de reconocimiento y gamificación',
    'Superar barreras comunes de adopción'
  ],
  
  key_points = ARRAY[
    'Cambio cultural > cambio técnico. Comprar contenedores es fácil, cambiar hábitos es difícil pero esencial',
    'Liderazgo visible: CEO modela comportamiento, menciona cero residuos en mensajes, asigna recursos',
    'Comunicación visual: Señalización clara con fotos (no solo texto), código colores, feedback visible',
    'Incentivos: $500 por idea, día libre para equipo ganador, sorteos mensuales, placa "Muro de Campeones"',
    'Hacer fácil lo correcto: Contenedores convenientes, múltiples puntos, mantenimiento, no más difícil separar que tirar'
  ],
  
  did_you_know = ARRAY[
    'Subaru Indiana: CEO comprometido públicamente - "Cero relleno 2020" - meta alcanzada 4 años adelantado (2016)',
    'New Belgium Brewing: 99.9% desviación desde 2013 + Employee engagement top 5% nacional',
    'Dashboard visible con métricas en tiempo real aumenta participación 40-60%',
    'Gamificación y competencias entre equipos puede acelerar adopción de 12 meses a 3 meses'
  ],
  
  real_world_example = 'New Belgium Brewing (Colorado - aplicable a México): Cultura de cero residuos profundamente arraigada. En contratación preguntan sobre valores ambientales. Onboarding: día completo sobre sostenibilidad. Todos los empleados son dueños de acciones (beneficio compartido). Tours de residuos: todos visitan recicladora y composta. Evento anual "Fat Tire Ride" en bici al trabajo. Resultado: 99.9% desviación de relleno desde 2013, employee engagement top 5% nacional, clientes atraídos por valores (premium pricing).',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Plan de Cambio Cultural',
    'description', 'Diseñar estrategia para construir cultura de cero residuos en 6 meses',
    'steps', ARRAY[
      'Evaluación de cultura actual: Encuestar 30-50 empleados sobre comprensión, conocimiento, motivación',
      'Analizar resultados: ¿Dónde están los gaps? ¿Qué necesita más atención?',
      'Definir estado deseado: ¿Cómo se ve éxito cultural en 12 meses? Metas específicas',
      'Estrategias por segmento: Alta gerencia (caso negocio), media (herramientas), personal (fácil + incentivos)',
      'Plan de comunicación 6 meses: Mes 1 Lanzamiento, Mes 2 Aprendizaje, Mes 3 Aceleración, Mes 4-6 Sostenimiento',
      'Métricas de cultura: % capacitados, tasa contaminación, # ideas, % participación, puntuación encuesta',
      'Presupuesto: Capacitación, señalización, incentivos, dashboard, eventos, personal',
      'Calcular ROI esperado: Ahorros año 1 vs. inversión'
    ],
    'deliverable', 'Plan de Cambio Cultural (10-15 páginas) con: evaluación estado actual (encuesta + análisis), visión estado deseado, estrategias segmentadas por audiencia, plan de comunicación 6 meses, calendario de actividades, métricas de éxito (culturales + operacionales), presupuesto y ROI',
    'time_estimate', '5-7 horas',
    'tools_needed', ARRAY['Herramienta de encuestas', 'Plantillas de plan', 'Calculadora ROI']
  ),
  activity_required = true,
  
  tools_used = ARRAY['survey-tool', 'culture-assessment', 'roi-calculator'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Behavioral Economics for Sustainability',
        'url', 'https://www.behaviouralinsights.co.uk',
        'description', 'Cómo cambiar comportamientos ambientales'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Encuestar empleados sobre cultura actual de residuos',
    'Identificar campeones verdes potenciales en cada área',
    'Diseñar señalización visual para contenedores',
    'Planear evento de lanzamiento (kick-off)',
    'Definir incentivos y sistema de reconocimiento'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'zero_waste' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 4;

-- ============================================
-- LESSON 4.5: "Medición y Mejora Continua"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Tres meses después, los números son claros. Desviación de relleno: 71%, arriba de 23% inicial. Ahorro mensual: $67,000 MXN.',
    'conflict', 'Pero Carlos no está satisfecho. "71% es bueno, pero ¿dónde está el otro 29%? ¿Podemos llegar a 90%? ¿95%?"',
    'development', 'El equipo acepta el reto. Implementan auditorías semanales, dashboard en tiempo real, métricas por área. Identifican contaminación como el problema principal. Intensifican capacitación. Ajustan sistema basado en feedback.',
    'resolution', 'Seis meses después: 89% desviación, ahorro $85k/mes, ingresos $12k/mes. Certificación UL 2799 Platino lograda. "Ahora vamos por TRUE Zero Waste," dice Carlos.'
  ),
  
  learning_objectives = ARRAY[
    'Definir y medir KPIs fundamentales: tasa desviación, intensidad residuos, costo gestión, valor recuperado',
    'Implementar dashboard en tiempo real y sistema de reporte',
    'Realizar auditorías de calidad y reducir contaminación',
    'Obtener certificaciones: UL 2799 (Zero Waste to Landfill) y TRUE (Total Resource Use and Efficiency)'
  ],
  
  key_points = ARRAY[
    'Tasa de desviación = (Reciclado + Compostado + Reutilizado) ÷ Total × 100. Metas: >40% inicial, >60% intermedio, >80% avanzado, >95% excelencia',
    'Intensidad de residuos (kg/unidad producida) muestra eficiencia incluso si creces',
    'Tasa de contaminación: <5% aceptable, <2% bueno, <0.5% excelente. Reciclables contaminados valen menos o se rechazan',
    'Certificación UL 2799: Plata (50%), Oro (75%), Platino (90%), Verdadero (100%) - auditoría terceros',
    'Certificación TRUE: Más rigurosa, incluye prevención no solo desviación, auditoría anual, usado por Google/Toyota/Patagonia'
  ],
  
  did_you_know = ARRAY[
    'Subaru Indiana: Primera planta automotriz zero-waste en USA - 99.9% desviación, ahorro $2M/año',
    'GM: 142 instalaciones zero-waste globalmente - ahorro acumulado $1 billion+ USD desde 2007',
    'Certificación cuesta $30-80k MXN pero ROI típico <12 meses por ahorros operativos',
    'Dashboard visible en tiempo real típicamente aumenta desviación 15-25% en primeros 3 meses'
  ],
  
  real_world_example = 'Subaru Indiana (USA - aplicable): Primera planta automotriz zero-waste en Norte América. Tasa desviación 99.9% (envían <1 contenedor/año a relleno). Programa implementado 2001-2004. Invirtieron $5M USD en infraestructura (contenedores, compactadores, biodigestor). Generan $5M USD/año vendiendo reciclables. Ahorran $2M/año vs. disposición previa. ROI: 2 años. Certificación TRUE Zero Waste nivel Platino. Resultado: Atrae talento, mejora marca, reduce costos, cumplimiento regulatorio adelantado.',
  
  activity_type = 'commitment',
  activity_config = jsonb_build_object(
    'title', 'Tu Cuadro de Mando de Cero Residuos + Certificación',
    'description', 'Diseñar sistema de seguimiento integral y plan para certificación Zero Waste',
    'steps', ARRAY[
      'Diseñar dashboard mensual: Métricas de desviación, calidad, cultura con línea base, actual, meta, tendencia',
      'Definir visualización: Dashboard digital (Excel/Sheets), reporte trimestral (PDF), infografía anual, presentación gerencia',
      'Establecer fuentes de datos: Reportes recolección, auditorías visuales, encuestas empleados, registros ventas reciclables',
      'Implementar auditorías de calidad: Frecuencia (semanal inicial, quincenal después), método (inspección muestra), feedback inmediato',
      'Plan de certificación: Evaluar UL 2799 (más accesible) vs. TRUE (más riguroso)',
      'Timeline certificación: 6 meses preparación, 3 meses auditoría, inversión estimada',
      'Calcular ROI: Beneficios tangibles (ahorro, ingresos) + intangibles (marca, talento, regulatorio)',
      'Mejora continua: Reuniones mensuales equipo verde, revisión métricas, ajustes al sistema'
    ],
    'deliverable', 'Cuadro de Mando de Cero Residuos (Excel/Sheets) con métricas clave, gráficos auto-generados, sección notas, plan recolección datos + Plan de Certificación (5-8 páginas) con: evaluación de preparación, gaps a cerrar, timeline 12 meses, presupuesto, ROI esperado',
    'time_estimate', '4-6 horas',
    'tools_needed', ARRAY['Excel/Google Sheets', 'Plantillas de dashboard', 'Calculadora ROI']
  ),
  activity_required = true,
  
  tools_used = ARRAY['dashboard-builder', 'metrics-tracker', 'certification-roadmap'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'UL 2799 Zero Waste to Landfill',
        'url', 'https://www.ul.com/services/zero-waste-landfill-validation',
        'description', 'Información sobre certificación Zero Waste'
      ),
      jsonb_build_object(
        'title', 'TRUE Zero Waste Certification',
        'url', 'https://true.gbci.org',
        'description', 'Certificación TRUE (más rigurosa)'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Crear dashboard con métricas fundamentales',
    'Establecer auditorías de calidad semanales',
    'Definir meta de desviación a 12 meses',
    'Investigar costos de certificación UL 2799',
    'Presentar plan de certificación a gerencia'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'zero_waste' 
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
WHERE mm.core_value = 'zero_waste'
  AND mm.status = 'published'
ORDER BY ml.lesson_order;

-- ✅ Success message
SELECT '🎉 Module 4 (Economía Circular: Cero Residuos) enrichment complete!' AS status,
       '5 lessons updated with story content, activities, and tools' AS details;

