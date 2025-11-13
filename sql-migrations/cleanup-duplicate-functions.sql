-- =====================================================
-- CLEANUP DUPLICATE FUNCTIONS (If Needed)
-- Only run if verification shows actual duplicates
-- =====================================================

BEGIN;

-- Drop all versions of functions (will recreate with correct signatures)
DROP FUNCTION IF EXISTS public.award_xp CASCADE;
DROP FUNCTION IF EXISTS public.calculate_tier_progress CASCADE;
DROP FUNCTION IF EXISTS public.check_achievements CASCADE;
DROP FUNCTION IF EXISTS public.update_user_streak CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard CASCADE;
DROP FUNCTION IF EXISTS public.calculate_tier CASCADE;
DROP FUNCTION IF EXISTS public.xp_for_next_tier CASCADE;
DROP FUNCTION IF EXISTS public.update_leaderboard_ranks CASCADE;

-- Now run phase-7-gamification-functions-safe.sql again
-- (This will recreate all functions with correct signatures)

COMMIT;

