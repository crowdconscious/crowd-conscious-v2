-- ================================================================
-- CHECK ACTIVITY RESPONSES SAVED
-- ================================================================
-- Run these queries to see if responses are being saved

-- 1. Check NEW activity_responses table
SELECT 
  id,
  user_id,
  enrollment_id,
  module_id,
  lesson_id,
  activity_type,
  pre_assessment_level,
  key_learning,
  confidence_level,
  completion_percentage,
  completed,
  created_at,
  updated_at
FROM activity_responses
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check LEGACY lesson_responses table
SELECT 
  id,
  enrollment_id,
  module_id,
  lesson_id,
  responses,
  evidence_urls,
  completed,
  created_at,
  updated_at
FROM lesson_responses
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for specific enrollment (replace with your enrollment_id)
-- From console: enrollment_id = '8eb92e55-261d-439e-bf2c-ba20245c8e06'
SELECT * FROM activity_responses 
WHERE enrollment_id = '8eb92e55-261d-439e-bf2c-ba20245c8e06'
ORDER BY created_at DESC;

-- 4. Check legacy responses for same enrollment
SELECT * FROM lesson_responses 
WHERE enrollment_id = '8eb92e55-261d-439e-bf2c-ba20245c8e06'
ORDER BY created_at DESC;

-- 5. Check for specific lesson (from URL)
-- lesson_id = 'b37cf275-91ce-42cc-93c7-5f1e7065d130'
SELECT * FROM activity_responses 
WHERE lesson_id = 'b37cf275-91ce-42cc-93c7-5f1e7065d130'
ORDER BY created_at DESC;

-- 6. Count total responses
SELECT 
  'activity_responses (new)' as table_name,
  COUNT(*) as total_responses
FROM activity_responses
UNION ALL
SELECT 
  'lesson_responses (legacy)' as table_name,
  COUNT(*) as total_responses
FROM lesson_responses;

-- 7. Check most recent saves (any user, any module)
SELECT 
  ar.id,
  p.full_name,
  mm.title as module_title,
  ml.title as lesson_title,
  ar.completion_percentage,
  ar.completed,
  ar.created_at
FROM activity_responses ar
LEFT JOIN profiles p ON ar.user_id = p.id
LEFT JOIN marketplace_modules mm ON ar.module_id = mm.id
LEFT JOIN module_lessons ml ON ar.lesson_id = ml.id
ORDER BY ar.created_at DESC
LIMIT 5;

-- 8. Debug: Check if RLS is blocking
-- Run this to see your current user_id
SELECT auth.uid() as current_user_id;

-- 9. Check RLS policies on activity_responses
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'activity_responses'
ORDER BY policyname;

