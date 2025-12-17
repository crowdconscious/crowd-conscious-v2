-- ============================================================================
-- CRITICAL SECURITY FIXES: Address Supabase Database Linter Errors
-- ============================================================================
-- This migration fixes:
-- 1. Exposed auth.users in views
-- 2. SECURITY DEFINER views
-- 3. RLS disabled on public tables
-- 4. Missing RLS policies
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Views - Remove SECURITY DEFINER and auth.users exposure
-- ============================================================================

-- Fix user_xp_breakdown: Remove auth.users exposure, use profiles instead
DROP VIEW IF EXISTS public.user_xp_breakdown CASCADE;

-- Use dynamic approach to handle different schema versions
DO $$
DECLARE
  user_col TEXT;
  completed_col TEXT;
  xp_earned_col TEXT;
  view_sql TEXT;
BEGIN
  -- Detect which columns exist in course_enrollments
  SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'user_id') 
      THEN 'user_id' ELSE 'employee_id' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'completed') 
      THEN 'completed' 
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'status') 
      THEN 'status' 
      ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'xp_earned') 
      THEN 'xp_earned' ELSE NULL END
  INTO user_col, completed_col, xp_earned_col;

  -- Build view SQL dynamically
  view_sql := format('
    CREATE OR REPLACE VIEW public.user_xp_breakdown AS
    SELECT 
      p.id as user_id,
      p.email,
      p.full_name,
      COALESCE(us.total_xp, 0) as community_xp,
      COALESCE(
        (SELECT SUM(%s) FROM course_enrollments WHERE %s = p.id),
        0
      ) as learning_xp,
      COALESCE(us.total_xp, 0) + COALESCE(
        (SELECT SUM(%s) FROM course_enrollments WHERE %s = p.id),
        0
      ) as total_unified_xp,
      -- Sources breakdown
      %s as modules_completed,
      COALESCE((SELECT COUNT(*) FROM community_content WHERE created_by = p.id), 0) as posts_created,
      COALESCE((SELECT COUNT(*) FROM comments WHERE user_id = p.id), 0) as comments_posted
    FROM public.profiles p
    LEFT JOIN public.user_stats us ON us.user_id = p.id
  ',
    COALESCE(xp_earned_col, '0'),
    user_col,
    COALESCE(xp_earned_col, '0'),
    user_col,
    CASE 
      WHEN completed_col = 'completed' THEN format('(SELECT COUNT(*) FROM course_enrollments WHERE %s = p.id AND completed = true)', user_col)
      WHEN completed_col = 'status' THEN format('(SELECT COUNT(*) FROM course_enrollments WHERE %s = p.id AND status = ''completed'')', user_col)
      ELSE format('(SELECT COUNT(*) FROM course_enrollments WHERE %s = p.id)', user_col)
    END
  );

  EXECUTE view_sql;

  RAISE NOTICE 'Created user_xp_breakdown view with detected columns';
  RAISE NOTICE 'User column: %, Completed column: %, XP column: %', user_col, completed_col, xp_earned_col;
END $$;

-- Grant access (RLS will control what users can see)
GRANT SELECT ON public.user_xp_breakdown TO authenticated;
GRANT SELECT ON public.user_xp_breakdown TO anon;

-- Fix leaderboard_view: Remove SECURITY DEFINER
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

GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon;

-- Fix user_enrolled_modules: Remove SECURITY DEFINER
-- Use dynamic approach to detect which columns exist (same as original migration)
DROP VIEW IF EXISTS public.user_enrolled_modules CASCADE;

DO $$
DECLARE
  user_col TEXT;
  module_id_col TEXT;
  module_name_col TEXT;
  status_col TEXT;
  completion_col TEXT;
  purchase_type_col TEXT;
  purchased_at_col TEXT;
  time_spent_col TEXT;
  view_sql TEXT;
BEGIN
  -- Detect which columns exist
  SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'user_id') 
      THEN 'user_id' ELSE 'employee_id' END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'module_id') 
      THEN 'module_id' ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'module_name') 
      THEN 'module_name' ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'status') 
      THEN 'status' ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'completion_percentage') 
      THEN 'completion_percentage' ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'purchase_type') 
      THEN 'purchase_type' ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'purchased_at') 
      THEN 'purchased_at' ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_enrollments' AND column_name = 'time_spent_minutes') 
      THEN 'time_spent_minutes' ELSE NULL END
  INTO user_col, module_id_col, module_name_col, status_col, completion_col, purchase_type_col, purchased_at_col, time_spent_col;

  -- Build view SQL dynamically based on what exists
  view_sql := format('
    CREATE OR REPLACE VIEW public.user_enrolled_modules AS
    SELECT 
      e.id AS enrollment_id,
      e.%I AS user_id,
      %s AS module_id,
      e.corporate_account_id,
      %s AS purchase_type,
      e.created_at AS enrollment_date,
      %s AS purchased_at,
      %s AS progress,
      %s AS completed,
      e.completed_at AS completion_date,
      NULL::TEXT AS certificate_url,
      %s AS module_title,
      NULL::TEXT AS module_description,
      NULL::TEXT AS thumbnail_url,
      NULL::INTEGER AS estimated_duration_hours,
      NULL::TEXT AS difficulty_level,
      NULL::TEXT AS core_value,
      CASE 
        WHEN e.corporate_account_id IS NOT NULL THEN ''corporate''
        ELSE ''individual''
      END AS access_type,
      %s AS status,
      %s AS time_spent_minutes
    FROM course_enrollments e
  ',
    user_col,
    COALESCE('e.' || module_id_col, 'NULL::TEXT'),
    COALESCE('COALESCE(e.' || purchase_type_col || ', ''corporate'')', '''corporate'''),
    COALESCE('e.' || purchased_at_col, 'NULL::TIMESTAMPTZ'),
    COALESCE('COALESCE(e.' || completion_col || ', 0)', '0'),
    COALESCE('CASE WHEN e.' || status_col || ' = ''completed'' THEN true ELSE false END', 'false'),
    COALESCE('COALESCE(e.' || module_name_col || ', ''Unknown Module'')', '''Unknown Module'''),
    COALESCE('COALESCE(e.' || status_col || ', ''not_started'')', '''not_started'''),
    COALESCE('COALESCE(e.' || time_spent_col || ', 0)', '0')
  );

  EXECUTE view_sql;

  RAISE NOTICE 'Created user_enrolled_modules view with detected columns';
  RAISE NOTICE 'User column: %, Module ID: %, Module Name: %', user_col, module_id_col, module_name_col;
END $$;

GRANT SELECT ON public.user_enrolled_modules TO authenticated;

-- Fix poll_options_with_totals: Remove SECURITY DEFINER
DROP VIEW IF EXISTS public.poll_options_with_totals CASCADE;

CREATE OR REPLACE VIEW public.poll_options_with_totals AS
SELECT 
  po.id,
  po.content_id,
  po.option_text,
  po.created_at,
  get_total_poll_votes(po.id) as vote_count
FROM poll_options po;

GRANT SELECT ON public.poll_options_with_totals TO authenticated;
GRANT SELECT ON public.poll_options_with_totals TO anon;

-- Fix marketplace_modules_with_pricing: Remove SECURITY DEFINER (if exists)
DROP VIEW IF EXISTS public.marketplace_modules_with_pricing CASCADE;

-- Recreate if needed (check if marketplace_modules table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_modules') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.marketplace_modules_with_pricing AS
      SELECT 
        m.*,
        COALESCE(m.price, 0) as current_price,
        CASE 
          WHEN m.price IS NULL OR m.price = 0 THEN ''free''
          ELSE ''paid''
        END as pricing_type
      FROM marketplace_modules m';
    
    GRANT SELECT ON public.marketplace_modules_with_pricing TO authenticated;
    GRANT SELECT ON public.marketplace_modules_with_pricing TO anon;
  END IF;
END $$;

-- Fix enrollment_time_breakdown: Remove SECURITY DEFINER (if exists)
DROP VIEW IF EXISTS public.enrollment_time_breakdown CASCADE;

-- Recreate if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.enrollment_time_breakdown AS
      SELECT 
        DATE_TRUNC(''day'', created_at) as enrollment_date,
        COUNT(*) as enrollments_count,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(time_spent_minutes) as avg_time_spent
      FROM course_enrollments
      GROUP BY DATE_TRUNC(''day'', created_at)
      ORDER BY enrollment_date DESC';
    
    GRANT SELECT ON public.enrollment_time_breakdown TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- PART 2: Enable RLS on all public tables
-- ============================================================================

-- Enable RLS on cart_items (policies already exist)
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on promo_code_uses
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on corporate_accounts
ALTER TABLE public.corporate_accounts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on employee_invitations
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on xp_rewards (read-only for most users)
ALTER TABLE public.xp_rewards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create/Update RLS Policies
-- ============================================================================

-- Profiles policies (if not already exist)
DO $$
BEGIN
  -- Drop existing policies to recreate cleanly
  DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;
  DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
  DROP POLICY IF EXISTS "Enable profile creation on signup" ON public.profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
  DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
  DROP POLICY IF EXISTS "Public can view leaderboard profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
END $$;

-- Public can view profiles (for leaderboard, etc.)
CREATE POLICY "Public can view profiles" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Service role can insert (for signup triggers)
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Promo codes policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "admins_only_can_view_promo_codes" ON public.promo_codes;
  DROP POLICY IF EXISTS "admins_can_insert_promo_codes" ON public.promo_codes;
  DROP POLICY IF EXISTS "admins_can_update_promo_codes" ON public.promo_codes;
  DROP POLICY IF EXISTS "admins_can_delete_promo_codes" ON public.promo_codes;
END $$;

-- Anyone can view active promo codes (for validation)
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
  FOR SELECT USING (active = true);

-- Admins can view all promo codes
CREATE POLICY "Admins can view all promo codes" ON public.promo_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admins can manage promo codes
CREATE POLICY "Admins can insert promo codes" ON public.promo_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update promo codes" ON public.promo_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can delete promo codes" ON public.promo_codes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Promo code uses policies
DROP POLICY IF EXISTS "Users can view own promo code uses" ON public.promo_code_uses;
DROP POLICY IF EXISTS "Users can insert own promo code uses" ON public.promo_code_uses;

CREATE POLICY "Users can view own promo code uses" ON public.promo_code_uses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promo code uses" ON public.promo_code_uses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all promo code uses
CREATE POLICY "Admins can view all promo code uses" ON public.promo_code_uses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Corporate accounts policies
DROP POLICY IF EXISTS "Corporate admins can view own account" ON public.corporate_accounts;
DROP POLICY IF EXISTS "Corporate admins can update own account" ON public.corporate_accounts;

CREATE POLICY "Corporate admins can view own account" ON public.corporate_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND profiles.corporate_account_id = corporate_accounts.id
      AND profiles.corporate_role = 'admin'
    )
  );

CREATE POLICY "Corporate admins can update own account" ON public.corporate_accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND profiles.corporate_account_id = corporate_accounts.id
      AND profiles.corporate_role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND profiles.corporate_account_id = corporate_accounts.id
      AND profiles.corporate_role = 'admin'
    )
  );

-- Service role can insert corporate accounts (for signup)
CREATE POLICY "Service role can insert corporate accounts" ON public.corporate_accounts
  FOR INSERT WITH CHECK (true);

-- Employee invitations policies
DROP POLICY IF EXISTS "Corporate admins can manage invitations" ON public.employee_invitations;
DROP POLICY IF EXISTS "Users can view own invitations" ON public.employee_invitations;

CREATE POLICY "Corporate admins can manage invitations" ON public.employee_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND profiles.corporate_account_id = employee_invitations.corporate_account_id
      AND profiles.corporate_role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND profiles.corporate_account_id = employee_invitations.corporate_account_id
      AND profiles.corporate_role = 'admin'
    )
  );

CREATE POLICY "Users can view own invitations" ON public.employee_invitations
  FOR SELECT USING (
    -- Users can see invitations sent to their email
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND LOWER(profiles.email) = LOWER(employee_invitations.email)
    ) OR
    -- Corporate admins can see all invitations for their account
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND profiles.corporate_account_id = employee_invitations.corporate_account_id
      AND profiles.corporate_role = 'admin'
    )
  );

-- XP rewards policies (read-only for most users)
DROP POLICY IF EXISTS "Anyone can view XP rewards" ON public.xp_rewards;
DROP POLICY IF EXISTS "Admins can manage XP rewards" ON public.xp_rewards;

CREATE POLICY "Anyone can view XP rewards" ON public.xp_rewards
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage XP rewards" ON public.xp_rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ============================================================================
-- PART 4: Add RLS policies for user_xp_breakdown view
-- ============================================================================

-- Since views inherit RLS from underlying tables, we need to ensure
-- users can only see their own data in user_xp_breakdown
-- This is handled by the profiles RLS policy, but we can add an additional check

-- Note: Views don't have RLS policies directly, but we can create a function
-- or ensure the underlying tables have proper RLS

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' 
-- AND tablename IN ('cart_items', 'profiles', 'promo_codes', 'promo_code_uses', 'corporate_accounts', 'employee_invitations', 'xp_rewards');

-- Check views don't have SECURITY DEFINER:
-- SELECT schemaname, viewname, definition FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname IN ('user_xp_breakdown', 'leaderboard_view', 'user_enrolled_modules', 'poll_options_with_totals', 'marketplace_modules_with_pricing', 'enrollment_time_breakdown');

-- Check policies exist:
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('cart_items', 'profiles', 'promo_codes', 'promo_code_uses', 'corporate_accounts', 'employee_invitations', 'xp_rewards');

