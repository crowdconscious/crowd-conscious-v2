-- 📚 ENRICH MODULE 1, LESSON 1: "El Impacto Invisible"
-- This adds full story content, learning objectives, tools, and activities

DO $$ 
BEGIN
  RAISE NOTICE '📚 Enriching Aire Limpio - Lesson 1...';
END $$;

-- Update Lesson 1 with full content
UPDATE module_lessons
SET 
  -- Story Content (JSONB)
  story_content = '{
    "opening": "María saca el inhalador de su hija de su bolso—la tercera vez esta semana. Afuera de las ventanas de la fábrica, nota una neblina gris asentándose sobre el vecindario. \"No siempre fue así,\" le dice Don Roberto en la parada del autobús, entre toses. \"Hace diez años, podías ver las montañas claramente cada mañana.\"",
    "conflict": "Esa noche, María no puede dormir. Piensa en la fábrica donde ha trabajado durante ocho años. Las máquinas, las entregas, la energía que mantiene todo funcionando. ¿Podrían ser parte del problema?",
    "dialogue": [
      "María: Descargué esta app de calidad del aire. Mira... nuestro vecindario está clasificado como No Saludable.",
      "Carlos: (sorprendido) Nunca pensé en verificarlo. Soy el nuevo gerente de sostenibilidad y ni siquiera sabía...",
      "María: Mi hija usa su inhalador tres veces por semana ahora. Antes era solo una vez al mes.",
      "Carlos: (pensativo) Necesitamos entender esto mejor. ¿Me ayudarías a investigar?"
    ],
    "resolution_preview": "Juntos, María y Carlos deciden medir la calidad del aire y la huella de carbono de la fábrica",
    "cliffhanger": "¿Qué descubrirán cuando comiencen a medir? ¿Puede una fábrica realmente marcar la diferencia?"
  }'::jsonb,
  
  -- Learning Objectives
  learning_objectives = ARRAY[
    'Entender las métricas de calidad del aire (PM2.5, PM10, CO2, COVs, NOx, SOx)',
    'Identificar fuentes de emisiones en tu organización',
    'Calcular la huella de carbono de tu organización (Alcance 1 y 2)',
    'Reconocer el impacto de la calidad del aire en la salud y ESG'
  ],
  
  -- Key Points
  key_points = ARRAY[
    'Las partículas PM2.5 son menores de 2.5 micrómetros y penetran profundamente en los pulmones',
    'Nivel seguro: <12 µg/m³ (estándar OMS). Ciudad de México promedia 25-30 µg/m³',
    'Grupo Bimbo redujo emisiones de PM2.5 en 38% y ahorró $2.8M MXN anualmente',
    'La calidad del aire impacta ESG: E (clima), S (salud de empleados), G (cumplimiento)',
    'México pierde $5.8 mil millones anuales debido a la mala calidad del aire'
  ],
  
  -- Did You Know
  did_you_know = ARRAY[
    'La contaminación del aire causa 7 millones de muertes prematuras globalmente cada año (OMS)',
    'La calidad del aire interior puede ser 2-5x peor que el aire exterior',
    'Una política de "no ralentí" para camiones puede ahorrar 10-15% en combustible y reducir NOx hasta 80%',
    'Las empresas certificadas con ISO 14001 reducen costos operativos en promedio 16%'
  ],
  
  -- Real World Example
  real_world_example = 'Grupo Bimbo (2020): Instalaron monitores de calidad del aire en 12 plantas, cambiaron 4,500 vehículos a eléctricos/híbridos, redujeron PM2.5 en 38%, ahorraron $2.8M MXN anualmente, y se comprometieron a reducir emisiones Alcance 1+2 en 50% para 2030. Fuente: Grupo Bimbo Sustainability Report 2020',
  
  -- Activity Configuration
  activity_type = 'audit',
  activity_config = '{
    "title": "Tu Línea Base de Calidad del Aire",
    "description": "Mide el estado actual de la calidad del aire de tu instalación y calcula tu huella de carbono",
    "instructions": [
      "Descarga una app de calidad del aire (IQAir, AIRE, o app gubernamental)",
      "Registra lecturas para tu instalación (3 veces/día durante 3 días)",
      "Registra lecturas para áreas residenciales cercanas",
      "Mapea fuentes de contaminación dentro de un radio de 5km",
      "Calcula tu huella de carbono (Alcance 1: vehículos, gas, diésel | Alcance 2: electricidad)",
      "Crea tu Documento de Evaluación de Calidad del Aire"
    ],
    "required_evidence": [
      "Lecturas de ICA (Índice de Calidad del Aire)",
      "Cálculo de huella de carbono (kg CO2/mes)",
      "Mapa de fuentes de emisión",
      "Fotos de emisiones visibles (opcional)"
    ],
    "time_estimate": "30-45 minutos",
    "tools_needed": [
      "Teléfono con app de calidad del aire",
      "Calculadora (o hoja de cálculo)",
      "Cámara para fotos"
    ],
    "success_criteria": "Documento completo con lecturas de ICA, cálculo de huella de carbono, y mapa de fuentes",
    "formulas": {
      "scope_1_vehicles": "km conducidos/mes × 0.27 kg CO2/km",
      "scope_1_gas": "m³ gas natural/mes × 2.0 kg CO2/m³",
      "scope_1_diesel": "litros diésel/mes × 2.68 kg CO2/L",
      "scope_2_electricity": "kWh/mes × 0.458 kg CO2/kWh (red México)"
    }
  }'::jsonb,
  activity_required = true,
  
  -- Tools Used in This Lesson
  tools_used = ARRAY[
    'AirQualityAssessment',
    'CarbonCalculator',
    'EvidenceUploader'
  ],
  
  -- Resources
  resources = '{
    "downloads": [
      {
        "title": "Plantilla de Evaluación de Calidad del Aire",
        "url": "/resources/air-quality-assessment-template.pdf",
        "type": "PDF",
        "description": "Plantilla para documentar tus lecturas y cálculos"
      },
      {
        "title": "Calculadora de Huella de Carbono (Excel)",
        "url": "/resources/carbon-footprint-calculator.xlsx",
        "type": "Excel",
        "description": "Hoja de cálculo con fórmulas pre-configuradas"
      }
    ],
    "links": [
      {
        "title": "Directrices de Calidad del Aire de la OMS",
        "url": "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health",
        "description": "Estándares internacionales de calidad del aire"
      },
      {
        "title": "NOM-025-SSA1-2021 (Norma Mexicana)",
        "url": "https://www.gob.mx/semarnat",
        "description": "Valores límite permisibles para partículas en México"
      },
      {
        "title": "ISO 14064 - Inventarios de Gases de Efecto Invernadero",
        "url": "https://www.iso.org/iso-14001-environmental-management.html",
        "description": "Estándar internacional para contabilidad de emisiones"
      }
    ],
    "apps": [
      {
        "name": "IQAir",
        "platform": "iOS/Android",
        "description": "Monitoreo de calidad del aire en tiempo real"
      },
      {
        "name": "AIRE - Calidad del Aire CDMX",
        "platform": "iOS/Android",
        "description": "Datos oficiales del Gobierno de la CDMX"
      }
    ]
  }'::jsonb,
  
  -- Next Steps
  next_steps = ARRAY[
    'Revisa tu evaluación de calidad del aire con tu equipo de sostenibilidad',
    'Identifica las 3 principales fuentes de emisiones que puedes abordar',
    'Agenda un recorrido de las instalaciones para mapear todos los puntos de emisión',
    'Investiga las regulaciones de calidad del aire para tu industria (NOM-025)',
    'Establece una reunión de revisión de 30 días para verificar el progreso'
  ]

WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
  AND lesson_order = 1
  AND title = 'El Impacto Invisible';

-- Verify update
DO $$ 
BEGIN
  IF FOUND THEN
    RAISE NOTICE '✅ Lesson 1 enriched successfully!';
  ELSE
    RAISE NOTICE '⚠️ Lesson 1 not found - check module_id and title';
  END IF;
END $$;

-- Show updated lesson
SELECT 
  id,
  title,
  lesson_order,
  estimated_minutes,
  xp_reward,
  array_length(learning_objectives, 1) as objectives_count,
  array_length(key_points, 1) as key_points_count,
  array_length(tools_used, 1) as tools_count,
  jsonb_array_length(story_content->'dialogue') as dialogue_count,
  '✅ Enriched Lesson 1' as note
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
  AND lesson_order = 1;

DO $$ 
BEGIN
  RAISE NOTICE '🎉 Module 1, Lesson 1 is now RICH with story-driven content!';
  RAISE NOTICE '📖 Story: María discovers air quality issues';
  RAISE NOTICE '🎓 4 learning objectives, 5 key points, 4 did-you-know facts';
  RAISE NOTICE '🛠️ 3 interactive tools: AirQualityAssessment, CarbonCalculator, EvidenceUploader';
  RAISE NOTICE '📚 Resources: 2 downloads, 3 links, 2 apps';
  RAISE NOTICE '✅ Ready to test in the frontend!';
END $$;

