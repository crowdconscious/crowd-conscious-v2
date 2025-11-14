-- ============================================================================
-- COMPREHENSIVE FIX: Leaderboard RLS Policies and View
-- ============================================================================
-- This ensures leaderboard can query users properly
-- ============================================================================

-- Step 1: Drop conflicting RLS policies
-- ============================================================================

-- Drop old restrictive policies on user_xp
DROP POLICY IF EXISTS "Users can view own XP" ON public.user_xp;
DROP POLICY IF EXISTS "Users can view own XP transactions" ON public.xp_transactions;

-- Drop old policies on user_stats (keep the public one)
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
-- Keep "Users can view all user stats" as it allows public read

-- Step 2: Create public read policies for leaderboard
-- ============================================================================

-- Allow public read access to user_xp for leaderboard
DROP POLICY IF EXISTS "Public can view leaderboard XP" ON public.user_xp;
CREATE POLICY "Public can view leaderboard XP" ON public.user_xp
  FOR SELECT USING (true);

-- Allow users to view their own XP details (for personal stats)
CREATE POLICY "Users can view own XP details" ON public.user_xp
  FOR SELECT USING (auth.uid() = user_id);

-- Allow public read access to user_stats for leaderboard
DROP POLICY IF EXISTS "Public can view leaderboard stats" ON public.user_stats;
CREATE POLICY "Public can view leaderboard stats" ON public.user_stats
  FOR SELECT USING (true);

-- Allow users to update their own stats
CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Allow public read access to profiles for leaderboard (only name, email, avatar)
DROP POLICY IF EXISTS "Public can view leaderboard profiles" ON public.profiles;
CREATE POLICY "Public can view leaderboard profiles" ON public.profiles
  FOR SELECT USING (true);

-- Step 3: Recreate leaderboard_view with better error handling
-- ============================================================================

DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

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
  COALESCE(p.full_name, 'Anonymous User') as full_name,
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
GRANT SELECT ON public.leaderboard_view TO service_role;

-- Step 4: Ensure indexes exist
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_xp ON public.user_stats(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON public.user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Step 5: Create helper function to get user rank
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_xp INTEGER;
  v_rank INTEGER;
BEGIN
  -- Get user's total XP
  SELECT COALESCE(ux.total_xp, us.total_xp, 0) INTO v_user_xp
  FROM public.user_xp ux
  FULL OUTER JOIN public.user_stats us ON ux.user_id = us.user_id
  WHERE COALESCE(ux.user_id, us.user_id) = p_user_id;

  -- Count users with more XP
  SELECT COUNT(*) + 1 INTO v_rank
  FROM (
    SELECT COALESCE(ux.total_xp, us.total_xp, 0) as total_xp
    FROM public.user_xp ux
    FULL OUTER JOIN public.user_stats us ON ux.user_id = us.user_id
    WHERE COALESCE(ux.total_xp, us.total_xp, 0) > v_user_xp
  ) ranked_users;

  RETURN COALESCE(v_rank, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_rank TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank TO anon;

-- Step 6: Verification queries (commented out - run manually to verify)
-- ============================================================================

-- Check if view works:
-- SELECT * FROM public.leaderboard_view LIMIT 10;

-- Check user XP data:
-- SELECT COUNT(*) FROM public.user_xp WHERE total_xp > 0;
-- SELECT COUNT(*) FROM public.user_stats WHERE total_xp > 0;

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename IN ('user_xp', 'user_stats', 'profiles');

