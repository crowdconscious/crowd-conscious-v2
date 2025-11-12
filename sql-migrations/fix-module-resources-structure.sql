-- =====================================================
-- FIX: MODULE RESOURCES STRUCTURE STANDARDIZATION
-- =====================================================
-- This migration standardizes the resources field structure
-- across all module_lessons to use a consistent array format.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Standardize Resource Structure
-- =====================================================
-- Convert object format {links: [], videos: [], downloads: []}
-- to array format [{title, type, url, ...}]
-- =====================================================

UPDATE module_lessons
SET resources = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'title', item->>'title',
        'type', item->>'type',
        'url', item->>'url',
        'description', item->>'description',
        'name', item->>'name',
        'platform', item->>'platform',
        'duration', item->>'duration'
      )
    ),
    '[]'::jsonb
  )
  FROM (
    -- Extract links
    SELECT 
      jsonb_build_object(
        'title', link->>'title',
        'type', 'link',
        'url', link->>'url',
        'description', link->>'description'
      ) AS item
    FROM jsonb_array_elements(COALESCE(resources->'links', '[]'::jsonb)) AS link
    WHERE link->>'url' IS NOT NULL AND link->>'url' != '#'
    
    UNION ALL
    
    -- Extract videos
    SELECT 
      jsonb_build_object(
        'title', video->>'title',
        'type', 'video',
        'url', video->>'url',
        'duration', video->>'duration'
      ) AS item
    FROM jsonb_array_elements(COALESCE(resources->'videos', '[]'::jsonb)) AS video
    WHERE video->>'url' IS NOT NULL AND video->>'url' != '#'
    
    UNION ALL
    
    -- Extract downloads
    SELECT 
      jsonb_build_object(
        'title', download->>'title',
        'type', 'download',
        'url', download->>'url',
        'name', download->>'name'
      ) AS item
    FROM jsonb_array_elements(COALESCE(resources->'downloads', '[]'::jsonb)) AS download
    WHERE download->>'url' IS NOT NULL AND download->>'url' != '#'
    
    UNION ALL
    
    -- Extract external_links
    SELECT 
      jsonb_build_object(
        'title', link->>'title',
        'type', 'link',
        'url', link->>'url'
      ) AS item
    FROM jsonb_array_elements(COALESCE(resources->'external_links', '[]'::jsonb)) AS link
    WHERE link->>'url' IS NOT NULL AND link->>'url' != '#'
    
    UNION ALL
    
    -- Extract apps
    SELECT 
      jsonb_build_object(
        'title', app->>'name',
        'type', 'app',
        'url', app->>'platform',
        'description', app->>'description',
        'platform', app->>'platform'
      ) AS item
    FROM jsonb_array_elements(COALESCE(resources->'apps', '[]'::jsonb)) AS app
    
    UNION ALL
    
    -- Keep existing array items (if already in correct format)
    SELECT item
    FROM jsonb_array_elements(resources) AS item
    WHERE resources::text LIKE '[%'
      AND item->>'url' IS NOT NULL 
      AND item->>'url' != '#'
      AND (item->>'type' IS NOT NULL OR item->>'url' LIKE 'tool:%')
  ) AS all_items
)
WHERE resources IS NOT NULL
  AND resources::text != '[]'
  AND resources::text LIKE '{%'; -- Only update object format

-- =====================================================
-- 2. Remove Invalid Placeholder URLs
-- =====================================================
-- Remove resources with placeholder URLs (#)
-- =====================================================

UPDATE module_lessons
SET resources = (
  SELECT COALESCE(jsonb_agg(resource), '[]'::jsonb)
  FROM jsonb_array_elements(resources) AS resource
  WHERE resource->>'url' IS NOT NULL 
    AND resource->>'url' != '#'
    AND resource->>'url' != ''
)
WHERE resources IS NOT NULL
  AND resources::text LIKE '%"url": "#"%';

-- =====================================================
-- 3. Standardize Tool Names to kebab-case
-- =====================================================
-- Convert PascalCase and snake_case to kebab-case
-- =====================================================

UPDATE module_lessons
SET tools_used = ARRAY(
  SELECT 
    CASE
      -- PascalCase to kebab-case
      WHEN tool = 'AirQualityAssessment' THEN 'air-quality-assessment'
      WHEN tool = 'CarbonCalculator' THEN 'carbon-calculator'
      WHEN tool = 'EvidenceUploader' THEN 'evidence-uploader'
      WHEN tool = 'CostCalculator' THEN 'cost-calculator'
      WHEN tool = 'ReflectionJournal' THEN 'reflection-journal'
      
      -- snake_case to kebab-case
      WHEN tool = 'reflection_journal' THEN 'reflection-journal'
      WHEN tool = 'air_quality_assessment' THEN 'air-quality-assessment'
      WHEN tool = 'implementation_plan' THEN 'implementation-plan'
      WHEN tool = 'evidence_uploader' THEN 'evidence-uploader'
      
      -- Already kebab-case or other format, keep as is
      ELSE tool
    END
  FROM unnest(tools_used) AS tool
)
WHERE tools_used IS NOT NULL
  AND array_length(tools_used, 1) > 0;

-- =====================================================
-- 4. Add Missing Activity Configs
-- =====================================================
-- Add default activity configs for lessons with null configs
-- =====================================================

UPDATE module_lessons
SET activity_config = CASE activity_type
  WHEN 'reflection' THEN jsonb_build_object(
    'title', 'Reflexión',
    'description', 'Reflexiona sobre los conceptos aprendidos',
    'instructions', ARRAY[
      'Tómate 10-15 minutos para reflexionar',
      'Considera cómo aplicar estos conceptos',
      'Identifica tus próximos pasos'
    ],
    'reflectionPrompts', ARRAY[
      '¿Qué fue lo más impactante que aprendiste?',
      '¿Cómo puedes aplicar esto en tu organización?',
      '¿Qué obstáculos anticipas y cómo los superarías?'
    ],
    'time_estimate', '15 minutos'
  )
  WHEN 'assessment' THEN jsonb_build_object(
    'title', 'Evaluación',
    'description', 'Evalúa tu comprensión y aplicación',
    'instructions', ARRAY[
      'Completa la evaluación',
      'Reflexiona sobre tus respuestas',
      'Identifica áreas de mejora'
    ],
    'time_estimate', '20 minutos'
  )
  WHEN 'planning' THEN jsonb_build_object(
    'title', 'Planificación',
    'description', 'Crea un plan de acción',
    'instructions', ARRAY[
      'Define tus objetivos',
      'Establece un timeline',
      'Identifica recursos necesarios'
    ],
    'time_estimate', '30 minutos'
  )
  WHEN 'submission' THEN jsonb_build_object(
    'title', 'Entrega',
    'description', 'Prepara y entrega tu trabajo',
    'instructions', ARRAY[
      'Revisa los requisitos',
      'Prepara tu entrega',
      'Sube tu trabajo'
    ],
    'time_estimate', '45 minutos'
  )
  ELSE activity_config
END
WHERE activity_type IS NOT NULL
  AND activity_config IS NULL;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check resource structure consistency
SELECT 
  id,
  title,
  jsonb_typeof(resources) as resource_type,
  CASE 
    WHEN resources::text LIKE '[%' THEN 'Array format ✅'
    WHEN resources::text LIKE '{%' THEN 'Object format ⚠️'
    ELSE 'Unknown format ❌'
  END as format_status
FROM module_lessons
WHERE resources IS NOT NULL
ORDER BY resource_type DESC;

-- Check tool name consistency
SELECT DISTINCT tool
FROM module_lessons,
LATERAL unnest(tools_used) AS tool
WHERE tools_used IS NOT NULL
ORDER BY tool;

-- Check for remaining placeholder URLs
SELECT 
  id,
  title,
  resource->>'url' as url,
  resource->>'title' as resource_title
FROM module_lessons,
LATERAL jsonb_array_elements(resources) AS resource
WHERE resources IS NOT NULL
  AND (resource->>'url' = '#' OR resource->>'url' = '');

-- Check lessons with null activity configs
SELECT 
  id,
  title,
  activity_type,
  activity_config IS NULL as has_null_config
FROM module_lessons
WHERE activity_type IS NOT NULL
  AND activity_config IS NULL;

