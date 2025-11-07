-- 🔍 DIAGNOSE with CURRENT schema (works regardless of column names)

-- 1️⃣ What columns exist in lesson_responses?
SELECT 
  column_name, 
  data_type,
  '👉 lesson_responses columns' as table_name
FROM information_schema.columns
WHERE table_name = 'lesson_responses'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2️⃣ What columns exist in course_enrollments?
SELECT 
  column_name, 
  data_type,
  '👉 course_enrollments columns' as table_name
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3️⃣ Your current enrollment (if exists)
SELECT 
  id as enrollment_id,
  user_id,
  module_id,
  progress_percentage,
  completed,
  xp_earned,
  '👉 Your enrollment' as note
FROM course_enrollments
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 4️⃣ Show ALL data in lesson_responses (to see structure)
SELECT 
  *,
  '👉 All lesson_responses data' as note
FROM lesson_responses
LIMIT 10;

-- 5️⃣ Count how many lesson responses exist
SELECT 
  COUNT(*) as total_count,
  '👉 Total lesson responses in database' as note
FROM lesson_responses;

