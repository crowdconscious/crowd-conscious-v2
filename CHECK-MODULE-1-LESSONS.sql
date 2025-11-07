-- Check current Module 1 lessons
SELECT 
  id,
  lesson_order,
  title,
  description,
  estimated_minutes,
  xp_reward,
  CASE 
    WHEN story_content IS NOT NULL THEN '✅ Has story'
    ELSE '❌ No story'
  END as story_status,
  CASE 
    WHEN tools_used IS NOT NULL AND array_length(tools_used, 1) > 0 THEN '✅ Has tools'
    ELSE '❌ No tools'
  END as tools_status,
  CASE 
    WHEN activity_config IS NOT NULL THEN '✅ Has activity'
    ELSE '❌ No activity'
  END as activity_status
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'  -- Aire Limpio module
ORDER BY lesson_order;

