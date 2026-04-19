-- DIAGNOSE-MODULES-AND-SCHEMA.sql
-- This script shows the actual database schema and module data

-- ============================================
-- PART 1: CHECK COURSE_ENROLLMENTS SCHEMA
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- ============================================
-- PART 2: CHECK UNIQUE CONSTRAINTS
-- ============================================
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.course_enrollments'::regclass
    AND contype = 'u'; -- u = unique constraint

-- ============================================
-- PART 3: LIST ALL PUBLISHED MODULES
-- ============================================
SELECT 
    id,
    title,
    slug,
    core_value,
    status,
    base_price_mxn,
    (SELECT COUNT(*) FROM module_lessons WHERE module_id = marketplace_modules.id) as lesson_count
FROM public.marketplace_modules
WHERE status = 'published'
ORDER BY core_value, title;

-- ============================================
-- PART 4: CHECK YOUR PROFILE
-- ============================================
SELECT 
    id,
    full_name,
    email,
    corporate_account_id,
    corporate_role,
    user_type
FROM public.profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- ============================================
-- PART 5: CHECK EXISTING ENROLLMENTS
-- ============================================
SELECT 
    ce.id,
    ce.user_id,
    ce.module_id,
    ce.purchase_type,
    ce.progress_percentage,
    ce.completed,
    p.email as user_email
FROM public.course_enrollments ce
JOIN public.profiles p ON ce.user_id = p.id
WHERE p.email = 'francisco.blockstrand@gmail.com'
ORDER BY ce.created_at DESC;

