-- ENROLL-AFTER-STANDARDIZATION.sql
-- This script enrolls you in modules AFTER running STANDARDIZE-MODULE-NAMES.sql
-- Uses the cleaned-up, properly-named modules

-- ⚠️ PREREQUISITE: Run STANDARDIZE-MODULE-NAMES.sql FIRST!

-- ============================================
-- ENROLL IN: Gestión Sostenible del Agua
-- ============================================
INSERT INTO public.course_enrollments (
    id,
    user_id,
    course_id,          -- ⚠️ NULL for individual modules (only set for multi-module courses)
    module_id,          -- ⚠️ This references marketplace_modules
    purchase_type,
    purchased_at,
    status,
    completion_percentage,
    progress_percentage,
    completed,
    mandatory,
    xp_earned,
    total_score,
    max_score,
    total_time_spent,
    modules_completed,
    badges_earned,
    assigned_at,
    created_at,
    updated_at,
    last_accessed_at
)
SELECT
    gen_random_uuid(),
    p.id,
    NULL,               -- course_id = NULL (not a multi-module course)
    mm.id,              -- module_id = the individual module UUID
    'individual',
    NOW(),
    'not_started',
    0,
    0,
    false,
    false,
    0,
    0,
    0,
    0,
    0,
    ARRAY[]::text[],
    NOW(),
    NOW(),
    NOW(),
    NOW()
FROM
    public.profiles p
CROSS JOIN
    public.marketplace_modules mm
WHERE
    p.email = 'francisco.blockstrand@gmail.com'
    AND mm.title = 'Gestión Sostenible del Agua'  -- Use the NEW standardized name
    AND mm.core_value = 'clean_water'
    AND mm.status = 'published'
    -- Prevent duplicates (check module_id since course_id is NULL)
    AND NOT EXISTS (
        SELECT 1 FROM public.course_enrollments ce
        WHERE ce.user_id = p.id
        AND ce.module_id = mm.id
    )
RETURNING 
    id AS enrollment_id,
    user_id,
    course_id,
    module_id,
    purchase_type,
    status;

-- ============================================
-- OPTIONAL: Enroll in all other modules too
-- ============================================

-- Estrategias Avanzadas de Calidad del Aire
INSERT INTO public.course_enrollments (
    id, user_id, course_id, module_id, purchase_type, purchased_at,
    status, completion_percentage, progress_percentage, completed,
    mandatory, xp_earned, total_score, max_score, total_time_spent,
    modules_completed, badges_earned, assigned_at, created_at, updated_at, last_accessed_at
)
SELECT
    gen_random_uuid(), p.id, NULL, mm.id, 'individual', NOW(),
    'not_started', 0, 0, false, false, 0, 0, 0, 0, 0,
    ARRAY[]::text[], NOW(), NOW(), NOW(), NOW()
FROM profiles p, marketplace_modules mm
WHERE p.email = 'francisco.blockstrand@gmail.com'
AND mm.title = 'Estrategias Avanzadas de Calidad del Aire'
AND mm.status = 'published'
AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.user_id = p.id AND ce.module_id = mm.id
)
RETURNING id, (SELECT title FROM marketplace_modules WHERE id = module_id) as module_title;

-- Ciudades Seguras y Espacios Inclusivos
INSERT INTO public.course_enrollments (
    id, user_id, course_id, module_id, purchase_type, purchased_at,
    status, completion_percentage, progress_percentage, completed,
    mandatory, xp_earned, total_score, max_score, total_time_spent,
    modules_completed, badges_earned, assigned_at, created_at, updated_at, last_accessed_at
)
SELECT
    gen_random_uuid(), p.id, NULL, mm.id, 'individual', NOW(),
    'not_started', 0, 0, false, false, 0, 0, 0, 0, 0,
    ARRAY[]::text[], NOW(), NOW(), NOW(), NOW()
FROM profiles p, marketplace_modules mm
WHERE p.email = 'francisco.blockstrand@gmail.com'
AND mm.title = 'Ciudades Seguras y Espacios Inclusivos'
AND mm.status = 'published'
AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.user_id = p.id AND ce.module_id = mm.id
)
RETURNING id, (SELECT title FROM marketplace_modules WHERE id = module_id) as module_title;

-- Economía Circular: Cero Residuos
INSERT INTO public.course_enrollments (
    id, user_id, course_id, module_id, purchase_type, purchased_at,
    status, completion_percentage, progress_percentage, completed,
    mandatory, xp_earned, total_score, max_score, total_time_spent,
    modules_completed, badges_earned, assigned_at, created_at, updated_at, last_accessed_at
)
SELECT
    gen_random_uuid(), p.id, NULL, mm.id, 'individual', NOW(),
    'not_started', 0, 0, false, false, 0, 0, 0, 0, 0,
    ARRAY[]::text[], NOW(), NOW(), NOW(), NOW()
FROM profiles p, marketplace_modules mm
WHERE p.email = 'francisco.blockstrand@gmail.com'
AND mm.title = 'Economía Circular: Cero Residuos'
AND mm.status = 'published'
AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.user_id = p.id AND ce.module_id = mm.id
)
RETURNING id, (SELECT title FROM marketplace_modules WHERE id = module_id) as module_title;

-- Comercio Justo y Cadenas de Valor
INSERT INTO public.course_enrollments (
    id, user_id, course_id, module_id, purchase_type, purchased_at,
    status, completion_percentage, progress_percentage, completed,
    mandatory, xp_earned, total_score, max_score, total_time_spent,
    modules_completed, badges_earned, assigned_at, created_at, updated_at, last_accessed_at
)
SELECT
    gen_random_uuid(), p.id, NULL, mm.id, 'individual', NOW(),
    'not_started', 0, 0, false, false, 0, 0, 0, 0, 0,
    ARRAY[]::text[], NOW(), NOW(), NOW(), NOW()
FROM profiles p, marketplace_modules mm
WHERE p.email = 'francisco.blockstrand@gmail.com'
AND mm.title = 'Comercio Justo y Cadenas de Valor'
AND mm.status = 'published'
AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.user_id = p.id AND ce.module_id = mm.id
)
RETURNING id, (SELECT title FROM marketplace_modules WHERE id = module_id) as module_title;

-- ============================================
-- Verify your enrollments
-- ============================================
SELECT 
    '✅ YOUR ENROLLMENTS' as section,
    ce.id as enrollment_id,
    mm.title as module_title,
    mm.core_value,
    ce.status,
    ce.progress_percentage,
    ce.purchase_type,
    ce.purchased_at
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
ORDER BY ce.created_at DESC;

-- ✅ After this, refresh crowdconscious.app/employee-portal
-- ✅ All modules should appear!

