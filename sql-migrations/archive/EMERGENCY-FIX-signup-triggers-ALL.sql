-- ============================================================================
-- EMERGENCY FIX: Signup failing - "Something went wrong"
-- ============================================================================
-- Any trigger on auth.users that runs AFTER INSERT can cause signup to fail.
-- If the trigger fails (e.g. user_stats table missing, RLS blocking, wrong schema),
-- PostgreSQL rolls back the entire transaction → Supabase returns error → user sees
-- "Something went wrong" or "Database error saving new user".
--
-- This drops ALL known triggers on auth.users.
--
-- REPLACEMENT (no functionality lost):
-- - Profiles: Created by ensure-profile (signup page, auth callback, login)
-- - user_stats: Created by ensure-profile when profile is created
--
-- UNAFFECTED (no dependency on these triggers):
-- - Predictions (market_votes): Uses user_id; user_xp created on first vote
-- - Conscious Fund (fund_votes): Uses user_id only
-- - Market comments: Uses user_id only; profiles for display names
-- - Leaderboard: Uses user_xp + profiles
--
-- RUN IN SUPABASE SQL EDITOR: Copy this entire block and Run.
-- ============================================================================

-- Drop trigger 1: Profile creation (handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop trigger 2: user_stats creation (create_user_stats_on_signup)
-- This fails if user_stats table doesn't exist or has wrong schema
DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;

-- Verify no triggers remain on auth.users
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';
-- Should return 0 rows (or only system triggers)

-- ============================================================================
-- After running: Signup flow
-- ============================================================================
-- 1. User signs up → auth.users row created (no trigger runs)
-- 2. User gets "Check your email to confirm"
-- 3. User clicks confirmation link → auth callback
-- 4. Callback calls /api/auth/ensure-profile → creates profile if missing
-- 5. Redirect to /predictions
-- ============================================================================
