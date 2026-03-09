-- ============================================================
-- FIX: "permission denied for table users" on Admin Inbox
-- ============================================================
-- Run this entire script in Supabase SQL Editor.
-- It creates is_admin() and updates all admin RLS policies to
-- avoid querying auth.users (which the client cannot read).
-- ============================================================

-- STEP 1: Verify your admin status (run first to check)
-- If role is NULL or not 'admin', you need to set it in profiles
SELECT id, email, raw_user_meta_data->>'role' as jwt_role
FROM auth.users;

-- Check profiles.user_type (this is what is_admin() uses)
SELECT id, email, user_type FROM public.profiles WHERE user_type = 'admin';

-- If your user is NOT admin in profiles, run this (replace with your email):
-- UPDATE public.profiles SET user_type = 'admin' WHERE email = 'YOUR_EMAIL_HERE';

-- Optional: Set role in auth.users user_metadata (backup, not primary)
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'YOUR_EMAIL_HERE';

-- ============================================================
-- STEP 2: Create is_admin() function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if current user has user_type=admin in profiles. Use in RLS policies instead of querying auth.users.';

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ============================================================
-- STEP 3: Update all admin RLS policies
-- ============================================================

-- conscious_inbox
DROP POLICY IF EXISTS "Admin can update" ON public.conscious_inbox;
CREATE POLICY "Admin can update" ON public.conscious_inbox
  FOR UPDATE USING (public.is_admin());

-- fund_causes
DROP POLICY IF EXISTS "Admins can manage causes" ON public.fund_causes;
CREATE POLICY "Admins can manage causes" ON public.fund_causes
  FOR ALL TO authenticated USING (public.is_admin());

-- fund_votes
DROP POLICY IF EXISTS "Admins can delete votes" ON public.fund_votes;
CREATE POLICY "Admins can delete votes" ON public.fund_votes
  FOR DELETE TO authenticated USING (public.is_admin());

-- prediction_markets
DROP POLICY IF EXISTS "Admins can insert prediction markets" ON public.prediction_markets;
CREATE POLICY "Admins can insert prediction markets" ON public.prediction_markets
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update prediction markets" ON public.prediction_markets;
CREATE POLICY "Admins can update prediction markets" ON public.prediction_markets
  FOR UPDATE USING (public.is_admin());

-- marketplace_modules (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_modules') THEN
    DROP POLICY IF EXISTS "Anyone can view published modules" ON public.marketplace_modules;
    CREATE POLICY "Anyone can view published modules" ON public.marketplace_modules
      FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- STEP 4: Fix any policy that uses auth.users (search for others)
-- ============================================================
-- If you have more tables with admin policies, add them here.
-- Pattern: Replace
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
--   OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
-- With:
--   public.is_admin()

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After running, test the Admin Inbox page.
-- If you still get errors, check:
-- 1. Your profiles.user_type = 'admin' (run STEP 1 queries)
-- 2. Vercel/Supabase logs for the exact error message
-- 3. Any other tables that might have admin policies
