-- 295 rollback
BEGIN;
GRANT SELECT ON public.profiles TO anon, authenticated;
COMMENT ON POLICY "Public can view profiles" ON public.profiles IS NULL;
CREATE OR REPLACE VIEW public.leaderboard_view WITH (security_invoker = true) AS
 SELECT COALESCE(ux.user_id, us.user_id) AS user_id,
    COALESCE(ux.total_xp, us.total_xp, 0) AS total_xp,
    COALESCE(ux.current_tier,
        CASE
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 7501) THEN 5
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 3501) THEN 4
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 1501) THEN 3
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 501) THEN 2
            ELSE 1
        END) AS tier,
    COALESCE(p.full_name, 'Anonymous User'::text) AS full_name,
    p.email AS email,
    p.avatar_url
   FROM ((user_xp ux
     FULL JOIN user_stats us ON ((ux.user_id = us.user_id)))
     LEFT JOIN profiles p ON ((COALESCE(ux.user_id, us.user_id) = p.id)))
  WHERE ((COALESCE(ux.total_xp, us.total_xp, 0) > 0) AND (COALESCE(p.user_type, ''::text) <> 'admin'::text) AND (COALESCE(p.admin_level, ''::text) <> ALL (ARRAY['super'::text, 'super_admin'::text])))
  ORDER BY COALESCE(ux.total_xp, us.total_xp, 0) DESC;
COMMIT;
