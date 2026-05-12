-- ============================================================================
-- TEST LEADERBOARD QUERY - Direct test of what the API should return
-- ============================================================================
-- Run this to see exactly what data should be returned
-- ============================================================================

-- Test 1: Query user_stats with LEFT JOIN profiles (what API should use)
SELECT 
  us.user_id,
  us.total_xp,
  p.full_name,
  p.email,
  p.avatar_url
FROM public.user_stats us
LEFT JOIN public.profiles p ON us.user_id = p.id
WHERE us.total_xp > 0
ORDER BY us.total_xp DESC
LIMIT 10;

-- Test 2: Query user_stats with INNER JOIN profiles (old way - might filter out users)
SELECT 
  us.user_id,
  us.total_xp,
  p.full_name,
  p.email,
  p.avatar_url
FROM public.user_stats us
INNER JOIN public.profiles p ON us.user_id = p.id
WHERE us.total_xp > 0
ORDER BY us.total_xp DESC
LIMIT 10;

-- Test 3: Count users with XP vs users with profiles
SELECT 
  COUNT(DISTINCT us.user_id) as users_with_xp,
  COUNT(DISTINCT p.id) as users_with_profiles,
  COUNT(DISTINCT us.user_id) - COUNT(DISTINCT p.id) as users_without_profiles
FROM public.user_stats us
LEFT JOIN public.profiles p ON us.user_id = p.id
WHERE us.total_xp > 0;

-- Test 4: Show users with XP but no profile
SELECT 
  us.user_id,
  us.total_xp,
  p.id as profile_id
FROM public.user_stats us
LEFT JOIN public.profiles p ON us.user_id = p.id
WHERE us.total_xp > 0 AND p.id IS NULL;

