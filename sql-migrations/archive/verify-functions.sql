-- =====================================================
-- VERIFY FUNCTIONS - Check All Signatures
-- =====================================================

-- Check all function signatures (including overloads)
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  pg_get_function_arguments(oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public' 
AND routine_name IN (
  'award_xp',
  'calculate_tier_progress',
  'check_achievements',
  'update_user_streak',
  'get_leaderboard',
  'calculate_tier',
  'xp_for_next_tier',
  'update_leaderboard_ranks'
)
ORDER BY routine_name, pg_get_function_arguments(oid);

-- Check for duplicate function signatures (should be empty)
SELECT 
  routine_name,
  pg_get_function_arguments(oid) as arguments,
  COUNT(*) as count
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public' 
AND routine_name IN (
  'award_xp',
  'calculate_tier_progress',
  'check_achievements',
  'update_user_streak',
  'get_leaderboard'
)
GROUP BY routine_name, pg_get_function_arguments(oid)
HAVING COUNT(*) > 1;

