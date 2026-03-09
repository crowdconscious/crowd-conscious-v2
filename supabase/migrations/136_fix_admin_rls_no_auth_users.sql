-- ============================================================
-- 136: FIX "permission denied for table users" - Admin RLS
-- ============================================================
-- Problem: RLS policies that query auth.users or profiles inline
-- can cause "permission denied for table users" when the client
-- (anon/authenticated) cannot read auth.users.
--
-- Solution: Create is_admin() SECURITY DEFINER function that
-- checks profiles. The function runs with owner privileges and
-- can read profiles without triggering auth.users access.
-- ============================================================

-- 1. Create is_admin() helper (SECURITY DEFINER = runs with owner privileges)
-- Uses profiles.user_type (app's source of truth), NOT auth.users
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

-- 2. conscious_inbox - Admin can update
DROP POLICY IF EXISTS "Admin can update" ON public.conscious_inbox;
CREATE POLICY "Admin can update" ON public.conscious_inbox
  FOR UPDATE USING (public.is_admin());

-- 3. fund_causes - Admins can manage
DROP POLICY IF EXISTS "Admins can manage causes" ON public.fund_causes;
CREATE POLICY "Admins can manage causes" ON public.fund_causes
  FOR ALL TO authenticated USING (public.is_admin());

-- 4. fund_votes - Admins can delete votes
DROP POLICY IF EXISTS "Admins can delete votes" ON public.fund_votes;
CREATE POLICY "Admins can delete votes" ON public.fund_votes
  FOR DELETE TO authenticated USING (public.is_admin());

-- 5. prediction_markets - Admins can insert/update (from 119)
DROP POLICY IF EXISTS "Admins can insert prediction markets" ON public.prediction_markets;
CREATE POLICY "Admins can insert prediction markets" ON public.prediction_markets
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update prediction markets" ON public.prediction_markets;
CREATE POLICY "Admins can update prediction markets" ON public.prediction_markets
  FOR UPDATE USING (public.is_admin());

-- 6. marketplace_modules - Fix policy that queries auth.users (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketplace_modules') THEN
    DROP POLICY IF EXISTS "Anyone can view published modules" ON public.marketplace_modules;
    CREATE POLICY "Anyone can view published modules" ON public.marketplace_modules
      FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 7. Grant execute to authenticated (needed for RLS evaluation)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
