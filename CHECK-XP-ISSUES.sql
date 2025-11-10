-- =========================================================
-- Check XP Configuration and Tracking Issues
-- Generated: November 10, 2025
-- =========================================================

-- 1. Check what XP values are configured for modules
SELECT 
  id,
  title,
  xp_reward,
  core_value,
  lesson_count,
  status
FROM marketplace_modules
WHERE status = 'published'
ORDER BY core_value;

-- 2. Check actual XP earned in enrollments
SELECT 
  ce.id as enrollment_id,
  ce.user_id,
  ce.module_id,
  mm.title as module_name,
  mm.xp_reward as configured_xp,
  ce.xp_earned as actual_xp_earned,
  ce.status,
  ce.completed,
  ce.progress_percentage
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id IS NOT NULL
ORDER BY ce.created_at DESC
LIMIT 20;

-- 3. Check if XP is being saved in lesson_responses
SELECT 
  lr.id,
  lr.enrollment_id,
  lr.lesson_id,
  lr.completed,
  lr.quiz_score,
  lr.created_at,
  ce.module_id,
  mm.title as module_name
FROM lesson_responses lr
JOIN course_enrollments ce ON lr.enrollment_id = ce.id
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE lr.completed = true
ORDER BY lr.created_at DESC
LIMIT 20;

-- 4. Check for XP inconsistencies
SELECT 
  mm.title,
  mm.xp_reward as configured,
  mm.lesson_count,
  mm.xp_reward / NULLIF(mm.lesson_count, 0) as xp_per_lesson,
  COUNT(DISTINCT ce.id) as total_enrollments,
  AVG(ce.xp_earned) as avg_xp_earned,
  MAX(ce.xp_earned) as max_xp_earned
FROM marketplace_modules mm
LEFT JOIN course_enrollments ce ON mm.id = ce.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.title, mm.xp_reward, mm.lesson_count
ORDER BY mm.core_value;

-- 5. Find enrollments with zero XP but lessons completed
SELECT 
  ce.id as enrollment_id,
  mm.title as module_name,
  ce.xp_earned,
  ce.progress_percentage,
  ce.completed,
  COUNT(lr.id) as completed_lessons
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id AND lr.completed = true
WHERE ce.xp_earned = 0 
  AND ce.progress_percentage > 0
GROUP BY ce.id, mm.title, ce.xp_earned, ce.progress_percentage, ce.completed
HAVING COUNT(lr.id) > 0;

-- 6. Check if modules have inconsistent XP rewards
SELECT 
  core_value,
  COUNT(*) as module_count,
  MIN(xp_reward) as min_xp,
  MAX(xp_reward) as max_xp,
  AVG(xp_reward) as avg_xp,
  STRING_AGG(title || ' (' || xp_reward || ')', ', ') as modules_with_xp
FROM marketplace_modules
WHERE status = 'published'
GROUP BY core_value
ORDER BY core_value;

-- 7. Expected XP calculation (should be 50 XP per lesson * 5 lessons = 250 XP)
SELECT 
  id,
  title,
  lesson_count,
  xp_reward as current_xp,
  lesson_count * 50 as expected_xp,
  xp_reward - (lesson_count * 50) as xp_difference,
  CASE 
    WHEN xp_reward = lesson_count * 50 THEN '✅ Correct'
    ELSE '❌ Incorrect'
  END as xp_status
FROM marketplace_modules
WHERE status = 'published'
ORDER BY xp_status DESC, core_value;

