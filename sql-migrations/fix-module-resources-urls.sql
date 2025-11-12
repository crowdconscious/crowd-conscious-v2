-- =====================================================
-- FIX: MODULE RESOURCES URLs - ALL MODULES
-- =====================================================
-- This migration updates all invalid placeholder URLs
-- with real, working URLs and creates tool references
-- for templates/calculators that need to be built.
-- =====================================================

BEGIN;

-- =====================================================
-- MODULE 1: Estrategias Avanzadas de Calidad del Aire
-- =====================================================

-- Lesson 1: El Impacto Invisible
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'CFE - Calculadora de Factor de Emisión', 'type', 'link', 'url', 'https://lapem.cfe.gob.mx/normas/pdfs/t/SPA00-63.pdf', 'description', 'Factor de emisión del Sistema Eléctrico Nacional'),
  jsonb_build_object('title', 'GHG Protocol - Estándar Corporativo', 'type', 'link', 'url', 'https://ghgprotocol.org/corporate-standard', 'description', 'Estándar internacional para contabilidad de emisiones'),
  jsonb_build_object('title', 'Directrices de Calidad del Aire de la OMS', 'type', 'link', 'url', 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health', 'description', 'Estándares internacionales de calidad del aire'),
  jsonb_build_object('title', 'NOM-025-SSA1-2021 (Norma Mexicana)', 'type', 'link', 'url', 'https://www.gob.mx/semarnat/articulos/norma-oficial-mexicana-nom-025-ssa1-2021', 'description', 'Valores límite permisibles para partículas en México'),
  jsonb_build_object('title', 'ISO 14064 - Inventarios de Gases de Efecto Invernadero', 'type', 'link', 'url', 'https://www.iso.org/iso-14064-environmental-management.html', 'description', 'Estándar internacional para contabilidad de emisiones'),
  jsonb_build_object('title', 'Plantilla: Inventario de Emisiones', 'type', 'tool', 'url', 'tool:emission-inventory-template', 'description', 'Herramienta interactiva para crear tu inventario de emisiones'),
  jsonb_build_object('title', 'Calculadora de Huella de Carbono', 'type', 'tool', 'url', 'tool:carbon-footprint-calculator', 'description', 'Calcula tu huella de carbono con fórmulas pre-configuradas')
)
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
  AND lesson_order = 1;

-- Lesson 2: Identificando Fuentes de Emisión
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'CFE - Factor de Emisión', 'type', 'link', 'url', 'https://lapem.cfe.gob.mx/normas/pdfs/t/SPA00-63.pdf', 'description', 'Calculadora de factor de emisión CFE'),
  jsonb_build_object('title', 'GHG Protocol - Estándar Corporativo', 'type', 'link', 'url', 'https://ghgprotocol.org/corporate-standard', 'description', 'Estándar internacional para contabilidad de emisiones'),
  jsonb_build_object('title', 'Plantilla: Inventario de Emisiones', 'type', 'tool', 'url', 'tool:emission-inventory-template', 'description', 'Template para documentar tus fuentes de emisión')
)
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
  AND lesson_order = 2;

-- Lesson 3: Calculando el ROI
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Incentivos Fiscales Verdes México 2024', 'type', 'link', 'url', 'https://ciep.mx/bonos-sostenibles-en-mexico-nuevos-objetivos-y-financiamiento-publico/', 'description', 'Información sobre incentivos fiscales para proyectos sustentables'),
  jsonb_build_object('title', 'Calculadora ROI Sustentabilidad', 'type', 'tool', 'url', 'tool:sustainability-roi-calculator', 'description', 'Calcula el ROI de tus proyectos de sustentabilidad'),
  jsonb_build_object('title', 'Template: Caso de Negocio Ambiental', 'type', 'tool', 'url', 'tool:environmental-business-case', 'description', 'Plantilla para crear casos de negocio para proyectos ambientales')
)
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
  AND lesson_order = 3;

-- Lesson 4: Plan de Acción 90 Días
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Template: Plan de Acción 90 Días', 'type', 'tool', 'url', 'tool:90-day-action-plan', 'description', 'Crea tu plan de acción estructurado para 90 días'),
  jsonb_build_object('title', 'Checklist: Victorias Rápidas', 'type', 'tool', 'url', 'tool:quick-wins-checklist', 'description', 'Checklist para identificar y priorizar victorias rápidas'),
  jsonb_build_object('title', 'Guía: Cómo Presentar a Dirección', 'type', 'tool', 'url', 'tool:leadership-presentation-guide', 'description', 'Guía para presentar tu progreso a la dirección')
)
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
  AND lesson_order = 4;

-- =====================================================
-- MODULE 2: Gestión Sostenible del Agua
-- =====================================================

-- Lesson 1: El Agua en tu Empresa
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Mapa de Estrés Hídrico de México (CONAGUA)', 'type', 'link', 'url', 'https://www.gob.mx/conagua', 'description', 'Visualiza qué áreas de México enfrentan mayor estrés hídrico'),
  jsonb_build_object('title', 'GRI 303: Water and Effluents Standard', 'type', 'link', 'url', 'https://www.globalreporting.org/standards/media/1909/gri-303-water-and-effluents-2018.pdf', 'description', 'Estándar internacional para reporte de agua'),
  jsonb_build_object('title', 'Template: Auditoría de Uso de Agua', 'type', 'tool', 'url', 'tool:water-audit-template', 'description', 'Plantilla para documentar tu auditoría de uso de agua'),
  jsonb_build_object('title', 'Benchmarks: Intensidad de Agua por Industria', 'type', 'tool', 'url', 'tool:water-intensity-benchmarks', 'description', 'Compara tu intensidad de agua con benchmarks de industria')
)
WHERE module_id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
  AND lesson_order = 1;

-- Lesson 2: Huella Hídrica
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Guía de Detección y Reparación de Fugas', 'type', 'link', 'url', 'https://www.epa.gov/watersense/fix-leak-week', 'description', 'Métodos prácticos para encontrar y reparar fugas comunes'),
  jsonb_build_object('title', 'Checklist: Auditoría de Desperdicios de Agua', 'type', 'tool', 'url', 'tool:water-waste-audit-checklist', 'description', 'Checklist completo para auditar desperdicios de agua'),
  jsonb_build_object('title', 'Calculadora: Costo de Fugas', 'type', 'tool', 'url', 'tool:leak-cost-calculator', 'description', 'Calcula el costo de las fugas de agua en tu instalación')
)
WHERE module_id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
  AND lesson_order = 2;

-- Lesson 3: Estrategias de Ahorro
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'EPA WaterSense: Water Reuse Guide', 'type', 'link', 'url', 'https://www.epa.gov/waterreuse', 'description', 'Guía completa de opciones de reutilización de agua'),
  jsonb_build_object('title', 'Template: Diagrama de Flujo de Agua', 'type', 'tool', 'url', 'tool:water-flow-diagram-template', 'description', 'Plantilla para crear diagramas de flujo de agua'),
  jsonb_build_object('title', 'Calculadora: Cosecha de Agua de Lluvia', 'type', 'tool', 'url', 'tool:rainwater-harvest-calculator', 'description', 'Calcula el potencial de cosecha de agua de lluvia'),
  jsonb_build_object('title', 'Guía: Tecnologías de Reutilización de Agua', 'type', 'tool', 'url', 'tool:water-reuse-technologies-guide', 'description', 'Guía de tecnologías disponibles para reutilización')
)
WHERE module_id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
  AND lesson_order = 3;

-- Lesson 4: Calidad y Tratamiento
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'GRI 303: Water and Effluents Standard', 'type', 'link', 'url', 'https://www.globalreporting.org/standards/media/1909/gri-303-water-and-effluents-2018.pdf', 'description', 'Estándar para reporte de agua y compromiso comunitario'),
  jsonb_build_object('title', 'CDP Water Security Questionnaire', 'type', 'link', 'url', 'https://www.cdp.net/en/water', 'description', 'Cuestionario usado por inversionistas para evaluar riesgo hídrico'),
  jsonb_build_object('title', 'Template: Propuesta de Alianza Comunitaria', 'type', 'tool', 'url', 'tool:community-partnership-template', 'description', 'Plantilla para crear propuestas de proyectos comunitarios'),
  jsonb_build_object('title', 'Calculadora: Impacto de Proyectos de Agua', 'type', 'tool', 'url', 'tool:water-project-impact-calculator', 'description', 'Calcula el impacto de proyectos comunitarios de agua')
)
WHERE module_id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
  AND lesson_order = 4;

-- Lesson 5: Plan Gestión Hídrica
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'GRI 303: Water and Effluents 2018', 'type', 'link', 'url', 'https://www.globalreporting.org/standards/media/1909/gri-303-water-and-effluents-2018.pdf', 'description', 'Estándar completo para reporte de agua'),
  jsonb_build_object('title', 'CDP Water Security', 'type', 'link', 'url', 'https://www.cdp.net/en/water', 'description', 'Cuestionario de seguridad hídrica para inversionistas'),
  jsonb_build_object('title', 'Template: Panel de Desempeño Hídrico', 'type', 'tool', 'url', 'tool:water-performance-dashboard', 'description', 'Plantilla de Excel/Sheets para dashboard de agua'),
  jsonb_build_object('title', 'Guía: Divulgación GRI 303', 'type', 'tool', 'url', 'tool:gri-303-disclosure-guide', 'description', 'Guía paso a paso para reportar según GRI 303'),
  jsonb_build_object('title', 'Benchmarks: Intensidad de Agua Detallado', 'type', 'tool', 'url', 'tool:water-intensity-benchmarks-detailed', 'description', 'Benchmarks detallados por industria y región')
)
WHERE module_id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
  AND lesson_order = 5;

-- =====================================================
-- MODULE 3: Ciudades Seguras y Espacios Inclusivos
-- =====================================================

-- Lesson 1: Principios de Seguridad Urbana
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'ONU-Hábitat: Marco de Ciudades Seguras', 'type', 'link', 'url', 'https://unhabitat.org/topic/safer-cities', 'description', 'Marco internacional para ciudades seguras'),
  jsonb_build_object('title', 'Principios CPTED', 'type', 'link', 'url', 'https://cpted.net/', 'description', 'Crime Prevention Through Environmental Design'),
  jsonb_build_object('title', 'Checklist: Auditoría de Seguridad', 'type', 'tool', 'url', 'tool:security-audit-checklist', 'description', 'Checklist completo para auditoría de seguridad'),
  jsonb_build_object('title', 'Guía: Entrevistas Comunitarias', 'type', 'tool', 'url', 'tool:community-interview-guide', 'description', 'Guía para realizar entrevistas comunitarias efectivas'),
  jsonb_build_object('title', 'Template: Informe de Auditoría', 'type', 'tool', 'url', 'tool:audit-report-template', 'description', 'Plantilla para crear informes de auditoría')
)
WHERE module_id = '9219e237-bea5-4060-9a8e-7f69b238744a'
  AND lesson_order = 1;

-- Lesson 2: Mapeo de Seguridad
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Estándares de Iluminación Urbana', 'type', 'link', 'url', 'https://www.ies.org/', 'description', 'Estándares IES para iluminación urbana'),
  jsonb_build_object('title', 'Template: Matriz Impacto vs. Esfuerzo', 'type', 'tool', 'url', 'tool:impact-effort-matrix', 'description', 'Herramienta para priorizar mejoras de seguridad'),
  jsonb_build_object('title', 'Template: Plan Seguridad 3 Años', 'type', 'tool', 'url', 'tool:3-year-security-plan', 'description', 'Plantilla para crear plan de seguridad a largo plazo'),
  jsonb_build_object('title', 'Guía: Costos de Iluminación e Infraestructura', 'type', 'tool', 'url', 'tool:lighting-cost-guide', 'description', 'Guía de costos para proyectos de iluminación')
)
WHERE module_id = '9219e237-bea5-4060-9a8e-7f69b238744a'
  AND lesson_order = 2;

-- Lesson 3: Diseño de Espacios Seguros
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Project for Public Spaces (PPS)', 'type', 'link', 'url', 'https://www.pps.org/', 'description', 'Recursos para diseño de espacios públicos'),
  jsonb_build_object('title', 'Jan Gehl - Ciudades para la Gente', 'type', 'link', 'url', 'https://gehlpeople.com/', 'description', 'Metodología de diseño urbano centrado en personas'),
  jsonb_build_object('title', 'Guía: Entrevistas Diseño Participativo', 'type', 'tool', 'url', 'tool:participatory-design-interview-guide', 'description', 'Guía para entrevistas en diseño participativo'),
  jsonb_build_object('title', 'Template: Propuesta de Espacio Público', 'type', 'tool', 'url', 'tool:public-space-proposal-template', 'description', 'Plantilla para propuestas de espacios públicos'),
  jsonb_build_object('title', 'Catálogo: Mobiliario Urbano y Costos', 'type', 'tool', 'url', 'tool:urban-furniture-catalog', 'description', 'Catálogo de mobiliario urbano con costos')
)
WHERE module_id = '9219e237-bea5-4060-9a8e-7f69b238744a'
  AND lesson_order = 3;

-- Lesson 4: Movilidad Segura
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'ITDP México - Movilidad Sostenible', 'type', 'link', 'url', 'https://mexico.itdp.org/', 'description', 'Instituto de Políticas para el Transporte y el Desarrollo'),
  jsonb_build_object('title', 'Manual de Calles: Diseño Universal', 'type', 'link', 'url', 'https://manualcalles.mx/', 'description', 'Manual mexicano de diseño de calles'),
  jsonb_build_object('title', 'Template: Encuesta de Movilidad de Empleados', 'type', 'tool', 'url', 'tool:employee-mobility-survey', 'description', 'Plantilla de encuesta para empleados'),
  jsonb_build_object('title', 'Template: Plan de Movilidad Segura', 'type', 'tool', 'url', 'tool:safe-mobility-plan', 'description', 'Plantilla para crear plan de movilidad'),
  jsonb_build_object('title', 'Guía: Costos de Infraestructura de Movilidad', 'type', 'tool', 'url', 'tool:mobility-infrastructure-cost-guide', 'description', 'Guía de costos para infraestructura de movilidad')
)
WHERE module_id = '9219e237-bea5-4060-9a8e-7f69b238744a'
  AND lesson_order = 4;

-- Lesson 5: Plan de Seguridad Comunitaria
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'GRI 413: Comunidades Locales', 'type', 'link', 'url', 'https://www.globalreporting.org/standards/gri-standards-download-center/gri-413-local-communities/', 'description', 'Estándar GRI para reporte de comunidades'),
  jsonb_build_object('title', 'ODS 11: Ciudades y Comunidades Sostenibles', 'type', 'link', 'url', 'https://www.un.org/sustainabledevelopment/cities/', 'description', 'Objetivo de Desarrollo Sostenible 11'),
  jsonb_build_object('title', 'Template: Cuadro de Mando de Ciudades Seguras', 'type', 'tool', 'url', 'tool:safe-cities-dashboard', 'description', 'Dashboard para métricas de ciudades seguras'),
  jsonb_build_object('title', 'Template: Informe de Mini-Proyecto', 'type', 'tool', 'url', 'tool:mini-project-report-template', 'description', 'Plantilla para informes de mini-proyectos'),
  jsonb_build_object('title', 'Guía: Reporte ESG GRI 413 y ODS 11', 'type', 'tool', 'url', 'tool:gri-413-esg-report-guide', 'description', 'Guía para reportar según GRI 413 y ODS 11')
)
WHERE module_id = '9219e237-bea5-4060-9a8e-7f69b238744a'
  AND lesson_order = 5;

-- =====================================================
-- MODULE 4: Economía Circular: Cero Residuos
-- =====================================================

-- Lesson 1: De Lineal a Circular
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Ellen MacArthur Foundation - Economía Circular', 'type', 'link', 'url', 'https://ellenmacarthurfoundation.org/', 'description', 'Recursos y casos de estudio de economía circular'),
  jsonb_build_object('title', 'Template: Auditoría de Residuos', 'type', 'tool', 'url', 'tool:waste-audit-template', 'description', 'Plantilla para realizar auditoría completa de residuos')
)
WHERE module_id = '01887731-3f85-414b-97bc-8d2a62f77a91'
  AND lesson_order = 1;

-- Lesson 2: Auditoría de Residuos
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Bolsa de Residuos Industrial (CANACINTRA)', 'type', 'link', 'url', 'https://www.canacintra.org.mx/', 'description', 'Plataforma para encontrar compradores de residuos'),
  jsonb_build_object('title', 'Template: Reporte de Oportunidades de Simbiosis', 'type', 'tool', 'url', 'tool:industrial-symbiosis-opportunities-report', 'description', 'Plantilla para reportar oportunidades de simbiosis industrial')
)
WHERE module_id = '01887731-3f85-414b-97bc-8d2a62f77a91'
  AND lesson_order = 2;

-- Lesson 3: Las 5 R's
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Ellen MacArthur Foundation - Circular Design Guide', 'type', 'link', 'url', 'https://www.circulardesignguide.com/', 'description', 'Guía interactiva de diseño circular'),
  jsonb_build_object('title', 'Template: Propuesta de Rediseño Circular', 'type', 'tool', 'url', 'tool:circular-redesign-proposal', 'description', 'Plantilla para crear propuestas de rediseño circular')
)
WHERE module_id = '01887731-3f85-414b-97bc-8d2a62f77a91'
  AND lesson_order = 3;

-- Lesson 4: Reciclaje y Valorización
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Behavioral Economics for Sustainability', 'type', 'link', 'url', 'https://www.behaviouralinsights.co.uk/', 'description', 'Cómo cambiar comportamientos ambientales'),
  jsonb_build_object('title', 'Template: Plan de Cambio Cultural', 'type', 'tool', 'url', 'tool:cultural-change-plan', 'description', 'Plantilla para diseñar estrategias de cambio cultural')
)
WHERE module_id = '01887731-3f85-414b-97bc-8d2a62f77a91'
  AND lesson_order = 4;

-- Lesson 5: Compostaje Corporativo
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'UL 2799 Zero Waste to Landfill', 'type', 'link', 'url', 'https://www.ul.com/services/zero-waste-landfill-validation', 'description', 'Información sobre certificación Zero Waste'),
  jsonb_build_object('title', 'TRUE Zero Waste Certification', 'type', 'link', 'url', 'https://true.gbci.org/', 'description', 'Certificación TRUE (más rigurosa)'),
  jsonb_build_object('title', 'Template: Cuadro de Mando de Cero Residuos', 'type', 'tool', 'url', 'tool:zero-waste-dashboard', 'description', 'Dashboard para métricas de cero residuos'),
  jsonb_build_object('title', 'Template: Plan de Certificación', 'type', 'tool', 'url', 'tool:zero-waste-certification-plan', 'description', 'Plantilla para plan de certificación zero waste')
)
WHERE module_id = '01887731-3f85-414b-97bc-8d2a62f77a91'
  AND lesson_order = 5;

-- Lesson 6: Plan Cero Residuos (currently empty)
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Ellen MacArthur Foundation', 'type', 'link', 'url', 'https://ellenmacarthurfoundation.org/', 'description', 'Recursos adicionales sobre economía circular'),
  jsonb_build_object('title', 'Template: Plan Integral Cero Residuos', 'type', 'tool', 'url', 'tool:comprehensive-zero-waste-plan', 'description', 'Plantilla para crear plan integral de cero residuos')
)
WHERE module_id = '01887731-3f85-414b-97bc-8d2a62f77a91'
  AND lesson_order = 6;

-- =====================================================
-- MODULE 5: Comercio Justo y Cadenas de Valor
-- =====================================================

-- Lesson 1: Principios de Comercio Justo
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'GRI 204: Prácticas de Adquisición', 'type', 'link', 'url', 'https://www.globalreporting.org/standards/gri-standards-download-center/gri-204-procurement-practices/', 'description', 'Estándar internacional para reporte de prácticas de compra'),
  jsonb_build_object('title', 'Template: Informe de Cadena de Suministro', 'type', 'tool', 'url', 'tool:supply-chain-report-template', 'description', 'Plantilla para crear informes de cadena de suministro')
)
WHERE module_id = '1515d83c-8b76-4383-94e1-5be9b04cd3dd'
  AND lesson_order = 1;

-- Lesson 2: Mapeo de Cadena de Suministro
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'MIT Living Wage Calculator (México)', 'type', 'link', 'url', 'https://livingwage.mit.edu/', 'description', 'Calculadora de salario digno por región'),
  jsonb_build_object('title', 'B Corp Certification', 'type', 'link', 'url', 'https://www.bcorporation.net/es-es', 'description', 'Certificación de empresas con impacto social'),
  jsonb_build_object('title', 'Template: Reporte de Evaluación de Justicia', 'type', 'tool', 'url', 'tool:justice-evaluation-report', 'description', 'Plantilla para evaluar justicia en cadena de suministro')
)
WHERE module_id = '1515d83c-8b76-4383-94e1-5be9b04cd3dd'
  AND lesson_order = 2;

-- Lesson 3: Sourcing Local
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Toyota Supplier Development Program', 'type', 'link', 'url', 'https://www.toyota.com/', 'description', 'Caso de estudio de desarrollo de proveedores exitoso'),
  jsonb_build_object('title', 'Template: Propuesta de Programa de Desarrollo', 'type', 'tool', 'url', 'tool:supplier-development-program-proposal', 'description', 'Plantilla para crear propuestas de desarrollo de proveedores')
)
WHERE module_id = '1515d83c-8b76-4383-94e1-5be9b04cd3dd'
  AND lesson_order = 3;

-- Lesson 4: Salarios y Condiciones Dignas
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Patagonia Footprint Chronicles', 'type', 'link', 'url', 'https://www.patagonia.com/footprint/', 'description', 'Ejemplo líder de transparencia radical'),
  jsonb_build_object('title', 'IBM Food Trust', 'type', 'link', 'url', 'https://www.ibm.com/blockchain/solutions/food-trust', 'description', 'Plataforma blockchain para trazabilidad'),
  jsonb_build_object('title', 'Template: Plan de Implementación de Trazabilidad', 'type', 'tool', 'url', 'tool:traceability-implementation-plan', 'description', 'Plantilla para diseñar sistemas de trazabilidad')
)
WHERE module_id = '1515d83c-8b76-4383-94e1-5be9b04cd3dd'
  AND lesson_order = 4;

-- Lesson 5: Plan de Compras Responsables
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'B Impact Assessment', 'type', 'link', 'url', 'https://www.bcorporation.net/es-es/que-es-b-corp', 'description', 'Herramienta gratuita para medir impacto social'),
  jsonb_build_object('title', 'GRI Standards', 'type', 'link', 'url', 'https://www.globalreporting.org/standards/', 'description', 'Estándares internacionales de reporte de sostenibilidad'),
  jsonb_build_object('title', 'Template: Reporte de Impacto de Comercio Justo', 'type', 'tool', 'url', 'tool:fair-trade-impact-report', 'description', 'Plantilla para crear reportes de impacto de comercio justo')
)
WHERE module_id = '1515d83c-8b76-4383-94e1-5be9b04cd3dd'
  AND lesson_order = 5;

-- =====================================================
-- MODULE 6: Guía: Cómo Crear un Módulo
-- =====================================================

-- Lesson 1: Introducción
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Principios de Diseño Instruccional', 'type', 'link', 'url', 'https://www.instructionaldesign.org/', 'description', 'Fundamentos del diseño instruccional'),
  jsonb_build_object('title', 'Diario de Reflexión', 'type', 'tool', 'url', 'tool:reflection-journal', 'description', 'Herramienta para reflexionar sobre tu aprendizaje')
)
WHERE module_id = 'aa87bb66-37bd-4c82-b3b9-84822118f132'
  AND lesson_order = 1;

-- Lesson 2: Paso 1
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Canvas de Propuesta de Valor', 'type', 'tool', 'url', 'tool:value-proposition-canvas', 'description', 'Herramienta para definir tu propuesta de valor'),
  jsonb_build_object('title', 'Evaluación de Necesidades', 'type', 'tool', 'url', 'tool:air-quality-assessment', 'description', 'Herramienta para evaluar necesidades del mercado')
)
WHERE module_id = 'aa87bb66-37bd-4c82-b3b9-84822118f132'
  AND lesson_order = 2;

-- Lesson 3: Paso 2
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Template: Estructura de Módulo', 'type', 'tool', 'url', 'tool:module-structure-template', 'description', 'Plantilla para estructurar tu módulo'),
  jsonb_build_object('title', 'Plan de Implementación', 'type', 'tool', 'url', 'tool:implementation-plan', 'description', 'Herramienta para crear planes de implementación'),
  jsonb_build_object('title', 'Ejemplo: Módulo Aire Limpio', 'type', 'link', 'url', '/marketplace/63c08c28-638d-42d9-ba5d-ecfc541957b0', 'description', 'Revisa este módulo como ejemplo')
)
WHERE module_id = 'aa87bb66-37bd-4c82-b3b9-84822118f132'
  AND lesson_order = 3;

-- Lesson 4: Paso 3
UPDATE module_lessons
SET resources = jsonb_build_array(
  jsonb_build_object('title', 'Checklist de Lanzamiento', 'type', 'tool', 'url', 'tool:launch-checklist', 'description', 'Checklist completo para lanzar tu módulo'),
  jsonb_build_object('title', 'Subidor de Evidencia', 'type', 'tool', 'url', 'tool:evidence-uploader', 'description', 'Sube evidencia de tu trabajo'),
  jsonb_build_object('title', 'Guía de Precios', 'type', 'tool', 'url', 'tool:pricing-guide', 'description', 'Guía para establecer precios de tu módulo')
)
WHERE module_id = 'aa87bb66-37bd-4c82-b3b9-84822118f132'
  AND lesson_order = 4;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check all resources have valid URLs (no placeholders)
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title,
  resource->>'title' as resource_title,
  resource->>'url' as url,
  resource->>'type' as resource_type
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ml.resources, '[]'::jsonb)) AS resource
WHERE m.is_platform_module = true
  AND resources IS NOT NULL
  AND (resource->>'url' = '#' OR resource->>'url' = '' OR resource->>'url' IS NULL)
ORDER BY m.id, ml.lesson_order;

-- Summary: Resources per module
SELECT 
  m.title as module_title,
  COUNT(DISTINCT ml.id) as total_lessons,
  COUNT(DISTINCT resource->>'url') FILTER (WHERE resource->>'type' = 'link') as external_links,
  COUNT(DISTINCT resource->>'url') FILTER (WHERE resource->>'type' = 'tool') as tool_references,
  COUNT(DISTINCT resource->>'url') FILTER (WHERE resource->>'type' = 'download') as downloads
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ml.resources, '[]'::jsonb)) AS resource
WHERE m.is_platform_module = true
GROUP BY m.id, m.title
ORDER BY m.id;

