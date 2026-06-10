-- =============================================================================
-- PENDING USER APPROVAL — apply ONCE in the shared Supabase project (web + mobile
-- share the same database). Do NOT run via `supabase db push`. The identical file
-- ships in the mobile repo (20260605_leaderboard_view_exclude_superadmin.sql).
-- =============================================================================
-- Hide SUPER ADMINS (admin_level 'super'/'super_admin') and full admins
-- (user_type = 'admin') from the public XP leaderboard at the VIEW level, so the
-- fix reaches ALL clients (web + every mobile version, including already-shipped
-- builds) with no app update / OTA. Regular community moderators remain visible
-- (product decision: only super-admins are hidden).
--
-- The founder profile is user_type='user' + admin_level='super', which the
-- code-level isAdminUser/user_type checks miss; filtering in the view closes that
-- gap universally. Columns are unchanged so this is a safe in-place replace
-- (grants + dependents preserved). Mirrors web lib/leaderboard-exclusions.ts /
-- mobile src/lib/leaderboardFilter.ts (minus the 'moderator' tier).
-- =============================================================================

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
  AND COALESCE(p.user_type, '') <> 'admin'
  AND COALESCE(p.admin_level, '') NOT IN ('super', 'super_admin')
ORDER BY COALESCE(ux.total_xp, us.total_xp, 0) DESC;

GRANT SELECT ON public.leaderboard_view TO authenticated, anon, service_role;

-- Keep get_user_rank consistent: hidden super admins must not inflate ranks.
CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_xp INTEGER;
  v_rank INTEGER;
BEGIN
  SELECT COALESCE(ux.total_xp, us.total_xp, 0) INTO v_user_xp
  FROM public.user_xp ux
  FULL OUTER JOIN public.user_stats us ON ux.user_id = us.user_id
  WHERE COALESCE(ux.user_id, us.user_id) = p_user_id;

  SELECT COUNT(*) + 1 INTO v_rank
  FROM (
    SELECT COALESCE(ux.user_id, us.user_id) AS uid,
           COALESCE(ux.total_xp, us.total_xp, 0) AS total_xp
    FROM public.user_xp ux
    FULL OUTER JOIN public.user_stats us ON ux.user_id = us.user_id
    WHERE COALESCE(ux.total_xp, us.total_xp, 0) > COALESCE(v_user_xp, 0)
  ) ranked
  LEFT JOIN public.profiles p ON p.id = ranked.uid
  WHERE COALESCE(p.user_type, '') <> 'admin'
    AND COALESCE(p.admin_level, '') NOT IN ('super', 'super_admin');

  RETURN COALESCE(v_rank, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_rank(uuid) TO authenticated, anon;
