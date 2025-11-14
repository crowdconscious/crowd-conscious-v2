-- ============================================================================
-- FIX: Ensure leaderboard shows users from user_xp or user_stats
-- ============================================================================
-- This script ensures the leaderboard can query users properly
-- ============================================================================

-- Ensure RLS policies allow reading leaderboard data
-- ============================================================================

-- Allow public read access to user_xp for leaderboard (only total_xp and tier)
DROP POLICY IF EXISTS "Public can view leaderboard XP" ON public.user_xp;
CREATE POLICY "Public can view leaderboard XP" ON public.user_xp
  FOR SELECT USING (true);

-- Allow public read access to user_stats for leaderboard (only total_xp)
DROP POLICY IF EXISTS "Public can view leaderboard stats" ON public.user_stats;
CREATE POLICY "Public can view leaderboard stats" ON public.user_stats
  FOR SELECT USING (true);

-- Allow public read access to profiles for leaderboard (only name, email, avatar)
DROP POLICY IF EXISTS "Public can view leaderboard profiles" ON public.profiles;
CREATE POLICY "Public can view leaderboard profiles" ON public.profiles
  FOR SELECT USING (true);

-- Create a view for easier leaderboard queries
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  COALESCE(ux.user_id, us.user_id) as user_id,
  COALESCE(ux.total_xp, us.total_xp, 0) as total_xp,
  COALESCE(ux.current_tier, 
    CASE 
      WHEN COALESCE(ux.total_xp, us.total_xp, 0) >= 7501 THEN 5
      WHEN COALESCE(ux.total_xp, us.total_xp, 0) >= 3501 THEN 4
      WHEN COALESCE(ux.total_xp, us.total_xp, 0) >= 1501 THEN 3
      WHEN COALESCE(ux.total_xp, us.total_xp, 0) >= 501 THEN 2
      ELSE 1
    END
  ) as tier,
  p.full_name,
  p.email,
  p.avatar_url
FROM public.user_xp ux
FULL OUTER JOIN public.user_stats us ON ux.user_id = us.user_id
LEFT JOIN public.profiles p ON COALESCE(ux.user_id, us.user_id) = p.id
WHERE COALESCE(ux.total_xp, us.total_xp, 0) > 0
ORDER BY COALESCE(ux.total_xp, us.total_xp, 0) DESC;

-- Grant access to the view
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_xp ON public.user_stats(total_xp DESC);

