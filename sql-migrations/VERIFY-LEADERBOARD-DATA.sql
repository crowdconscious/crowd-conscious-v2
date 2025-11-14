-- ============================================================================
-- VERIFY LEADERBOARD DATA EXISTS
-- ============================================================================
-- Run this to check if users have XP data that should appear in leaderboard
-- ============================================================================

-- Check user_xp table
SELECT 
  'user_xp' as source,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE total_xp > 0) as users_with_xp,
  MAX(total_xp) as max_xp,
  AVG(total_xp) as avg_xp
FROM public.user_xp;

-- Check user_stats table
SELECT 
  'user_stats' as source,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE total_xp > 0) as users_with_xp,
  MAX(total_xp) as max_xp,
  AVG(total_xp) as avg_xp
FROM public.user_stats;

-- Check leaderboard_view
SELECT 
  'leaderboard_view' as source,
  COUNT(*) as total_users,
  MAX(total_xp) as max_xp,
  AVG(total_xp) as avg_xp
FROM public.leaderboard_view;

-- Show top 10 users from user_xp
SELECT 
  ux.user_id,
  ux.total_xp,
  ux.current_tier,
  p.full_name,
  p.email
FROM public.user_xp ux
LEFT JOIN public.profiles p ON ux.user_id = p.id
WHERE ux.total_xp > 0
ORDER BY ux.total_xp DESC
LIMIT 10;

-- Show top 10 users from user_stats
SELECT 
  us.user_id,
  us.total_xp,
  p.full_name,
  p.email
FROM public.user_stats us
LEFT JOIN public.profiles p ON us.user_id = p.id
WHERE us.total_xp > 0
ORDER BY us.total_xp DESC
LIMIT 10;

-- Show top 10 from leaderboard_view
SELECT * FROM public.leaderboard_view
ORDER BY total_xp DESC
LIMIT 10;

-- Check if profiles exist for users with XP
SELECT 
  COUNT(DISTINCT ux.user_id) as users_with_xp,
  COUNT(DISTINCT p.id) as users_with_profiles,
  COUNT(DISTINCT ux.user_id) - COUNT(DISTINCT p.id) as missing_profiles
FROM public.user_xp ux
LEFT JOIN public.profiles p ON ux.user_id = p.id
WHERE ux.total_xp > 0;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_xp', 'user_stats', 'profiles', 'leaderboard_view')
ORDER BY tablename, policyname;

