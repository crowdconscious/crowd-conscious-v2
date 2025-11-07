-- ============================================
-- ENRICH MODULE 5: Comercio Justo y Cadenas de Valor
-- All 5 Lessons
-- ============================================

-- NOTE: Using correct schema from Modules 2-4:
-- - Column name is 'lesson_order' NOT 'lesson_number'
-- - activity_config uses 'steps' (API maps to 'instructions')
-- - Following working pattern

-- ============================================
-- LESSON 5.1: "El Costo Verdadero de lo 'Barato'"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Carlos mapea la cadena de suministro en una pizarra blanca. Cada producto traza un camino: materias primas de China, manufactura en otro estado, empaque de Estados Unidos, ensamblaje local, distribución nacional.',
    'conflict', '"Miren todos estos pasos," dice. "Cada uno tiene un costo—no solo en dinero, sino en emisiones, riesgo, y relaciones. ¿Qué pasaría si simplificáramos?"',
    'development', 'María propone algo radical: "¿Por qué compramos suministros de proveedores a 300km de distancia cuando hay negocios locales que podrían proporcionarlos?" El gerente de compras frunce el ceño: "Porque son 5% más baratos."',
    'resolution', 'María responde: "¿Pero a qué costo? Transporte, emisiones, riesgo de cadena de suministro. Y mientras tanto, nuestra comunidad pierde empleos y oportunidades." Carlos interviene: "Hice los números. Si compramos local, ahorramos en transporte, apoyamos a nuestros vecinos, y construimos resiliencia. No es solo lo correcto—es lo inteligente."'
  ),
  
  learning_objectives = ARRAY[
    'Comprender los costos ocultos de las cadenas de suministro globales',
    'Analizar el caso de negocio para abastecimiento local',
    'Calcular el impacto del "efecto multiplicador" económico',
    'Mapear tu propia cadena de suministro y identificar oportunidades'
  ],
  
  key_points = ARRAY[
    'Transporte representa 30% de emisiones industriales globales',
    'COVID-19 demostró fragilidad: 75% empresas mexicanas tuvieron disrupciones',
    'Efecto multiplicador: $1 MXN local genera $1.10 impacto vs. $0.05-0.10 internacional (10-20x)',
    'Abastecimiento local reduce transporte 95%, mejora flexibilidad y control de calidad',
    'Objetivo alcanzable: 40-60% compras locales para mayoría de empresas'
  ],
  
  did_you_know = ARRAY[
    'Iniciativa "Hecho en Querétaro": 45 empresas aumentaron compras locales de 22% a 58%, crearon 1,200 empleos y ahorraron $180M MXN/año',
    'Proveedor local (30km) vs. lejano (2,800km): ahorro $0.35/caja, $35k/año en 100k cajas + mayor flexibilidad',
    'Transporte 1 ton por 1,000 km: Camión 60-150kg CO2, Tren 30-100kg, Barco 10-40kg, Avión 500-1,500kg',
    'Empresas con proveedores locales durante COVID: 3 semanas retraso vs. 12 semanas internacionales'
  ],
  
  real_world_example = 'Iniciativa "Hecho en Querétaro" - Clúster industrial incentivó compras locales entre 45 empresas participantes. Resultados en 3 años: Compras locales de 22% a 58%, 1,200 empleos locales creados, reducción 35% emisiones de transporte, ahorro colectivo $180M MXN/año. Demostró que local es viable y rentable.',
  
  activity_type = 'audit',
  activity_config = jsonb_build_object(
    'title', 'Mapeo de Cadena de Suministro',
    'description', 'Visualizar tu cadena de suministro actual e identificar oportunidades de localización',
    'steps', ARRAY[
      'Inventario de proveedores: Lista top 20-30 proveedores por gasto anual con producto, gasto, ubicación, distancia',
      'Análisis de localidad: Categoriza por distancia - Local (0-50km), Regional (51-300km), Nacional (301-1000km), Internacional (>1000km)',
      'Mapeo visual: Crea mapa con tu ubicación al centro, marca proveedores, líneas por volumen, código de color por categoría',
      'Análisis de oportunidades: Para cada proveedor internacional/nacional, investiga alternativas locales',
      'Calcular impacto potencial: Emisiones reducidas, ahorro transporte, reducción riesgo, impacto económico local',
      'Priorizar top 10 oportunidades de localización por impacto vs. viabilidad',
      'Crear plan de transición 12 meses con metas trimestrales'
    ],
    'deliverable', 'Informe de Cadena de Suministro (8-12 páginas) con: inventario completo proveedores, mapa visual, análisis localidad, top 10 oportunidades, cálculos de impacto (emisiones, costos, economía), plan de transición con timeline',
    'time_estimate', '4-6 horas',
    'tools_needed', ARRAY['Excel/Sheets', 'Google My Maps o similar', 'Datos de proveedores']
  ),
  activity_required = true,
  
  tools_used = ARRAY['supply-chain-mapper', 'cost-calculator', 'carbon-calculator'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'GRI 204: Prácticas de Adquisición',
        'url', 'https://www.globalreporting.org',
        'description', 'Estándar internacional para reporte de prácticas de compra'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Completar inventario de top 20-30 proveedores actuales',
    'Crear mapa visual de cadena de suministro',
    'Investigar 3-5 alternativas locales prioritarias',
    'Calcular impacto potencial de localización',
    'Presentar análisis a equipo de compras'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 1;

-- ============================================
-- LESSON 5.2: "Salarios Justos y Condiciones Dignas"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María visita la fábrica de un proveedor pequeño. Los trabajadores se ven cansados. Uno le dice en voz baja: "Ganamos $300 al día. No alcanza. Mi esposa también trabaja y apenas cubrimos renta y comida."',
    'conflict', 'María hace la pregunta difícil en la reunión: "¿Pagan nuestros proveedores salarios dignos?" Silencio incómodo. Nadie sabe.',
    'development', 'El equipo investiga: La mayoría de proveedores pagan mínimo legal pero no salario digno. María propone: "Si exigimos a nuestros proveedores pagar mejor, algunos aumentarán precios. ¿Estamos dispuestos?"',
    'resolution', 'Carlos responde: "Debemos. Y lo haremos gradualmente, apoyándolos en el proceso. No se trata de castigar, sino de elevar juntos."'
  ),
  
  learning_objectives = ARRAY[
    'Distinguir entre salario mínimo, salario de mercado y salario digno',
    'Calcular brechas salariales en tu organización y cadena de suministro',
    'Comprender el caso de negocio para salarios dignos (productividad, retención)',
    'Evaluar prácticas laborales de proveedores clave'
  ],
  
  key_points = ARRAY[
    'Salario mínimo CDMX 2025: $278.80/día. Salario digno (MIT): $440/día. Brecha: 58%',
    'Salario digno cubre: alimentación, vivienda, transporte, salud, educación, ahorros básicos',
    'Costco ($24/hr) vs. Walmart ($14/hr): Rotación 6% vs. 60%, productividad $13,650 vs. $8,000/empleado',
    'Salarios dignos = inversión: Mayor productividad, menor rotación, mejor calidad, moral alto',
    'Certificaciones: Fair Trade, Fair Trade USA, B Corp (Grupo Bimbo certificado desde 2020)'
  ],
  
  did_you_know = ARRAY[
    'Costo de reemplazar empleado: 50-200% de salario anual (reclutamiento, capacitación, productividad perdida)',
    'Estudio 2023 México: Empresas con salarios top 25% tienen productividad 34% mayor que promedio',
    'B Corp: Más de 100 empresas mexicanas certificadas, incluyendo Grupo Bimbo',
    'El costo de cerrar brecha salarial gradualmente (3 años) es menor que costo de alta rotación'
  ],
  
  real_world_example = 'Costco vs. Walmart - Costco estrategia salario alto ($24/hr, 2x mínimo USA, beneficios completos): Rotación 6%/año, productividad $13,650/empleado, más rentable por m². Walmart salario bajo ($14/hr, beneficios limitados): Rotación 60%/año, productividad $8,000/empleado. Lección: Salarios dignos son inversión rentable, no costo.',
  
  activity_type = 'assessment',
  activity_config = jsonb_build_object(
    'title', 'Evaluación de Justicia en Cadena de Suministro',
    'description', 'Evaluar prácticas laborales actuales con empleados y proveedores',
    'steps', ARRAY[
      'Auditoría interna: Calcular salario promedio vs. digno, cobertura beneficios, rotación, accidentes, capacitación',
      'Identificar brechas: Para cada métrica, calcular % de brecha vs. meta',
      'Auditoría proveedores: Seleccionar top 10 proveedores, evaluar transparencia, salarios, condiciones, certificaciones',
      'Entrevistas confidenciales: Hablar con 10-15 empleados sobre percepción de justicia salarial',
      'Calcular costo de cerrar brechas: Gradualmente en 3 años vs. costo de rotación actual',
      'Crear plan de mejora: Priorizar acciones internas primero, luego proveedores',
      'Definir política de compra ética: Criterios mínimos para proveedores futuros'
    ],
    'deliverable', 'Reporte de Evaluación de Justicia (10-15 páginas) con: métricas internas vs. metas, análisis de brechas, evaluación de proveedores, resumen entrevistas, cálculo de costos, plan de mejora 3 años, política de compra ética',
    'time_estimate', '5-7 horas',
    'tools_needed', ARRAY['Calculadora salario digno (MIT)', 'Template auditoría', 'Datos RH']
  ),
  activity_required = true,
  
  tools_used = ARRAY['living-wage-calculator', 'supplier-audit-tool', 'cost-benefit-calculator'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'MIT Living Wage Calculator (México)',
        'url', 'https://livingwage.mit.edu',
        'description', 'Calculadora de salario digno por región'
      ),
      jsonb_build_object(
        'title', 'B Corp Certification',
        'url', 'https://www.bcorporation.net/es-es',
        'description', 'Certificación de empresas con impacto social'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Calcular brecha salarial interna vs. salario digno',
    'Entrevistar empleados sobre justicia salarial percibida',
    'Evaluar prácticas laborales de top 5 proveedores',
    'Calcular ROI de cerrar brecha gradualmente',
    'Presentar plan de mejora a gerencia'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 2;

-- ============================================
-- LESSON 5.3: "Construyendo Capacidad Local"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'María encuentra un proveedor local prometedor, pero su capacidad es limitada. "Podemos producir 1,000 unidades/mes," dice el dueño. "Ustedes necesitan 5,000. No tengo el equipo."',
    'conflict', 'Carlos propone algo inusual: "¿Y si te ayudamos a crecer? Préstamo sin interés, capacitación técnica, contrato garantizado. Tú creces, nosotros ganamos proveedor confiable."',
    'development', 'El proveedor está escéptico pero acepta. Crowd Conscious invierte $500k MXN en equipos. Envían ingenieros para capacitar. Garantizan compras por 2 años.',
    'resolution', 'Un año después: El proveedor ahora produce 6,000 unidades/mes, contrató 15 empleados locales. Crowd Conscious ahorró 18% en costos vs. proveedor anterior. Ganan-ganan.'
  ),
  
  learning_objectives = ARRAY[
    'Comprender modelos de desarrollo de proveedores locales',
    'Diseñar programa de apoyo a proveedores (financiero, técnico, comercial)',
    'Evaluar ROI de inversión en capacidad local',
    'Crear relaciones de largo plazo con proveedores estratégicos'
  ],
  
  key_points = ARRAY[
    'Desarrollo de proveedores: Financiamiento, capacitación técnica, apoyo administrativo, contratos garantizados',
    'Modelo Grameen-Danone: Co-inversión para crear proveedores locales, resultado exitoso en Bangladesh y México',
    'ROI típico: 2-4 años, beneficios permanentes (proveedor confiable, costos menores, impacto social)',
    'Clave del éxito: Compromiso mutuo, comunicación abierta, metas claras, soporte continuo',
    'Impacto multiplicador: 1 proveedor desarrollado → 10-50 empleos indirectos en comunidad'
  ],
  
  did_you_know = ARRAY[
    'Programa "Supplier Development" de Toyota: Capacitó 200+ proveedores mexicanos, redujo defectos 70%, costos 25%',
    'Modelo Grameen-Danone México: Yogurt producido por cooperativas locales, 40 empleos directos + 200 indirectos',
    'CEMEX "Patrimonio Hoy": Programa de crédito para distribuidores pequeños, creó 5,000 micro-empresarios',
    'Proveedor local con apoyo típicamente alcanza competitividad en 12-24 meses vs. 5+ años sin apoyo'
  ],
  
  real_world_example = 'Modelo Grameen-Danone (Bangladesh adaptado a México) - Danone invirtió en cooperativas locales para producir yogurt fortificado. Proporcionó: capacitación producción, equipo subsidiado, contratos largo plazo, apoyo administrativo. Resultado: 40 empleos directos, 200 indirectos, producto asequible para comunidades rurales, yogurt a precio 30% menor que mercado, cooperativas autosostenibles en 3 años.',
  
  activity_type = 'design',
  activity_config = jsonb_build_object(
    'title', 'Programa de Desarrollo de Proveedores',
    'description', 'Diseñar programa integral para apoyar crecimiento de proveedores locales',
    'steps', ARRAY[
      'Identificar proveedor objetivo: Producto estratégico, capacidad limitada actual, potencial de crecimiento, alineación valores',
      'Evaluación de necesidades: ¿Qué les falta? (equipo, capacitación, financiamiento, clientes, gestión)',
      'Diseñar paquete de apoyo: Financiero (préstamo, garantía, anticipo), técnico (capacitación, asesoría), comercial (contrato, volumen garantizado)',
      'Calcular inversión requerida: Equipos, capacitación, tiempo de tu equipo, capital de trabajo',
      'Proyectar ROI: Costos evitados (proveedor actual), ahorros futuros, valor intangible (control, confiabilidad)',
      'Definir estructura de acuerdo: Contrato largo plazo, metas claras, proceso de revisión, plan de salida',
      'Plan de implementación: Timeline 24 meses, hitos clave, métricas de éxito, revisiones trimestrales',
      'Preparar propuesta: Presentar a proveedor y a tu gerencia'
    ],
    'deliverable', 'Propuesta de Programa de Desarrollo (12-15 páginas) con: perfil proveedor objetivo, evaluación de necesidades, paquete de apoyo detallado, presupuesto, proyección ROI 5 años, estructura de acuerdo, plan implementación, métricas éxito',
    'time_estimate', '6-8 horas',
    'tools_needed', ARRAY['Financial model template', 'Contract template', 'Supplier assessment']
  ),
  activity_required = true,
  
  tools_used = ARRAY['supplier-dev-planner', 'roi-calculator', 'contract-generator'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Toyota Supplier Development Program',
        'url', 'https://www.toyota.com',
        'description', 'Caso de estudio de desarrollo de proveedores exitoso'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Identificar 3-5 proveedores locales con potencial',
    'Evaluar necesidades específicas de cada uno',
    'Calcular inversión requerida y ROI proyectado',
    'Diseñar estructura de acuerdo mutuamente beneficioso',
    'Presentar propuesta piloto a gerencia'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 3;

-- ============================================
-- LESSON 5.4: "Transparencia y Trazabilidad"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Un cliente pregunta: "¿De dónde viene esto?" María se da cuenta: No sabe. "Comprado de distribuidor X," dice. "¿Pero antes de eso?" Silencio.',
    'conflict', 'Carlos propone implementar sistema de trazabilidad. "Cada producto debe tener historia: origen, quién lo hizo, bajo qué condiciones." El gerente de operaciones protesta: "Eso es trabajo enorme."',
    'development', 'María responde: "Pero es lo correcto. Y cada vez más, es lo que el mercado exige." Implementan códigos QR: Escanea el producto, ve toda la cadena.',
    'resolution', 'Tres meses después: Clientes aman la transparencia. Ventas +15%. Competidores empiezan a copiar. Crowd Conscious lidera.'
  ),
  
  learning_objectives = ARRAY[
    'Comprender importancia de trazabilidad en cadenas de suministro',
    'Implementar sistemas de tracking (códigos QR, blockchain, certificaciones)',
    'Desarrollar políticas de transparencia y reporte público',
    'Usar transparencia como ventaja competitiva'
  ],
  
  key_points = ARRAY[
    'Trazabilidad: Capacidad de rastrear producto desde origen hasta consumidor final',
    'Tecnologías: Códigos QR, RFID, Blockchain, Certificaciones digitales',
    'Niveles de transparencia: Tier 1 (proveedores directos) → Tier 2 (proveedores de proveedores) → Tier 3+',
    'Consumidores pagan más: 66% dispuestos a pagar 10-20% más por productos totalmente trazables',
    'Herramientas: Provenance, Sourcemap, IBM Food Trust, Good.fish (blockchain)'
  ],
  
  did_you_know = ARRAY[
    'Patagonia "Footprint Chronicles": Mapa interactivo muestra origen de cada prenda, ventas +25% primer año',
    'Walmart requiere blockchain para proveedores de vegetales de hoja verde, trazabilidad de 7 días a 2 segundos',
    'Tony''s Chocolonely: 100% trazabilidad cacao, precio premium 40%, participación mercado crece 300%',
    'Ley de Debida Diligencia UE 2024: Exige transparencia completa de cadena de suministro'
  ],
  
  real_world_example = 'Patagonia "Footprint Chronicles" - Mapa interactivo en web muestra origen de cada producto: dónde se cultivó algodón, qué fábrica lo cosió, impacto ambiental de cada etapa. Incluye fotos de trabajadores, auditorías de fábricas. Resultado: Transparencia total aumentó confianza, ventas +25% primer año, premio a innovación. Consumidores dispuestos a pagar premium por honestidad.',
  
  activity_type = 'implementation',
  activity_config = jsonb_build_object(
    'title', 'Sistema de Trazabilidad y Transparencia',
    'description', 'Diseñar e implementar sistema de trazabilidad para productos clave',
    'steps', ARRAY[
      'Seleccionar productos piloto: 3-5 productos estratégicos o de alto impacto',
      'Mapear cadena completa: Para cada producto, identificar todos los pasos desde materia prima hasta venta final',
      'Recolectar datos: Para cada etapa, documentar (ubicación, proveedor, certificaciones, condiciones)',
      'Elegir tecnología: QR codes (simple, barato), RFID (automatizado), Blockchain (ultra-confiable)',
      'Diseñar interfaz consumidor: ¿Qué información mostrar? ¿Cómo presentarla? (web, app, etiqueta)',
      'Implementar piloto: Sistema para productos seleccionados, capacitar equipo, lanzar',
      'Medir impacto: Ventas, engagement, feedback consumidores, costos operativos',
      'Escalar: Expandir a más productos basado en resultados'
    ],
    'deliverable', 'Plan de Implementación de Trazabilidad (10-12 páginas) con: productos piloto seleccionados, mapas completos de cadena, datos recolectados, tecnología elegida (justificada), mockups de interfaz, presupuesto, timeline 6 meses, métricas de éxito',
    'time_estimate', '5-7 horas',
    'tools_needed', ARRAY['Supply chain mapping tool', 'QR code generator', 'Web mockup tool']
  ),
  activity_required = true,
  
  tools_used = ARRAY['traceability-mapper', 'qr-generator', 'transparency-dashboard'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'Patagonia Footprint Chronicles',
        'url', 'https://www.patagonia.com/footprint',
        'description', 'Ejemplo líder de transparencia radical'
      ),
      jsonb_build_object(
        'title', 'IBM Food Trust',
        'url', 'https://www.ibm.com/blockchain/solutions/food-trust',
        'description', 'Plataforma blockchain para trazabilidad'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Seleccionar 3 productos piloto para trazabilidad',
    'Mapear cadena completa de cada producto',
    'Investigar costos de implementación (QR, RFID, blockchain)',
    'Crear mockup de interfaz para consumidor',
    'Presentar plan de implementación a gerencia'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' 
  AND status = 'published'
  LIMIT 1
)
AND lesson_order = 4;

-- ============================================
-- LESSON 5.5: "Midiendo el Impacto Social y Económico"
-- ============================================
UPDATE module_lessons
SET
  story_content = jsonb_build_object(
    'opening', 'Seis meses después del programa de comercio justo, Carlos hace una presentación a la junta: "Aquí están los números."',
    'conflict', 'La junta quiere ROI financiero claro. Carlos muestra: Ahorros en transporte $240k, menor rotación $180k, mejor calidad -$95k defectos. Total: $415k MXN.',
    'development', 'Pero hay más: 85 empleos locales creados en proveedores, $2.1M circulados en economía local, emisiones -185 toneladas CO2. "Estos números también cuentan," dice María.',
    'resolution', 'El CEO asiente: "El ROI financiero es fuerte. El ROI social es extraordinario. Continuamos y escalamos." Crowd Conscious se certifica B Corp.'
  ),
  
  learning_objectives = ARRAY[
    'Definir y medir KPIs de comercio justo (económicos, sociales, ambientales)',
    'Calcular retorno social de inversión (SROI)',
    'Desarrollar reporte de impacto integral',
    'Usar métricas de impacto para decisiones estratégicas'
  ],
  
  key_points = ARRAY[
    'KPIs económicos: % compras locales, ahorro costos transporte, reducción riesgo cadena, ROI proveedores',
    'KPIs sociales: Empleos creados (directos/indirectos), salarios dignos, capacitación, desarrollo comunidad',
    'KPIs ambientales: Reducción emisiones transporte, certificaciones sostenibles, residuos reducidos',
    'SROI (Social Return on Investment): $1 invertido en comercio justo → $3-7 valor social generado',
    'Reporte B Corp: Marco integral para medir impacto en trabajadores, comunidad, ambiente, gobernanza'
  ],
  
  did_you_know = ARRAY[
    'Empresas B Corp en México crecen 2.3x más rápido que promedio mercado (2018-2023)',
    'SROI promedio programas comercio justo: $4.50 valor social por cada $1 invertido',
    'Ben & Jerry''s: Reporte anual de impacto social genera más PR que publicidad tradicional',
    'Consumidores México: 81% prefieren comprar de empresas con impacto social positivo medible'
  ],
  
  real_world_example = 'Ben & Jerry''s - Reporte Anual de Impacto Social: Documenta % ingredientes Fair Trade (82%), salarios dignos (100% empleados), apoyo a granjas familiares, inversión comunitaria ($2.5M/año). Transparencia total sobre éxitos y fracasos. Resultado: Confianza consumidor top 5% industria, lealtad marca superior, crecimiento sostenido 15%/año, atrae talento comprometido.',
  
  activity_type = 'reporting',
  activity_config = jsonb_build_object(
    'title', 'Reporte de Impacto de Comercio Justo',
    'description', 'Crear dashboard y reporte integral midiendo impacto económico, social y ambiental',
    'steps', ARRAY[
      'Definir línea base: Para cada métrica clave, documentar estado antes de iniciativa',
      'Recolectar datos: Económicos (costos, ahorros, ventas), sociales (empleos, salarios, capacitación), ambientales (emisiones, certificaciones)',
      'Calcular impacto: Cambio absoluto y % vs. línea base para cada métrica',
      'Calcular SROI: Monetizar beneficios sociales/ambientales, dividir entre inversión',
      'Crear visualizaciones: Gráficos de tendencia, comparaciones, infografías',
      'Desarrollar narrativa: Historia del programa, desafíos, éxitos, aprendizajes',
      'Stakeholder input: Entrevistas con proveedores, empleados, comunidad',
      'Publicar reporte: Versión interna (detallada) y externa (resumida para web)'
    ],
    'deliverable', 'Reporte de Impacto de Comercio Justo (15-20 páginas) con: resumen ejecutivo, línea base vs. actual, métricas económicas/sociales/ambientales, cálculo SROI, casos de éxito, desafíos/aprendizajes, metas futuras, dashboard visual',
    'time_estimate', '6-8 horas',
    'tools_needed', ARRAY['Excel/Sheets', 'PowerBI/Tableau', 'Template reporte impacto']
  ),
  activity_required = true,
  
  tools_used = ARRAY['impact-dashboard', 'sroi-calculator', 'reporting-tool'],
  
  resources = jsonb_build_object(
    'links', jsonb_build_array(
      jsonb_build_object(
        'title', 'B Impact Assessment',
        'url', 'https://www.bcorporation.net/es-es',
        'description', 'Herramienta gratuita para medir impacto social'
      ),
      jsonb_build_object(
        'title', 'GRI Standards',
        'url', 'https://www.globalreporting.org',
        'description', 'Estándares internacionales de reporte de sostenibilidad'
      )
    )
  ),
  
  next_steps = ARRAY[
    'Definir línea base para todas las métricas clave',
    'Establecer sistema de recolección de datos continua',
    'Crear dashboard de métricas de impacto',
    'Calcular SROI del programa',
    'Preparar primer reporte de impacto trimestral'
  ],
  
  updated_at = NOW()
WHERE module_id = (
  SELECT id FROM marketplace_modules 
  WHERE core_value = 'fair_trade' 
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
WHERE mm.core_value = 'fair_trade'
  AND mm.status = 'published'
ORDER BY ml.lesson_order;

-- ✅ Success message
SELECT '🎉 Module 5 (Comercio Justo y Cadenas de Valor) enrichment complete!' AS status,
       '5 lessons updated with story content, activities, and tools' AS details;

