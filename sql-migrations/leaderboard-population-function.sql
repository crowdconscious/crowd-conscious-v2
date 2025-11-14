-- ============================================================================
-- LEADERBOARD POPULATION FUNCTION
-- ============================================================================
-- This function populates/updates the leaderboards table from user_xp or user_stats
-- Should be called periodically or via trigger
-- ============================================================================

-- Function to update leaderboard ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_rank INTEGER := 1;
  v_total_xp INTEGER;
  v_current_tier INTEGER;
BEGIN
  -- Clear existing leaderboard
  TRUNCATE TABLE public.leaderboards;

  -- Populate from user_xp table (preferred source)
  FOR v_user IN
    SELECT 
      ux.user_id,
      ux.total_xp,
      ux.current_tier
    FROM public.user_xp ux
    ORDER BY ux.total_xp DESC
  LOOP
    INSERT INTO public.leaderboards (user_id, total_xp, tier, rank)
    VALUES (v_user.user_id, v_user.total_xp, v_user.current_tier, v_rank)
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = EXCLUDED.total_xp,
      tier = EXCLUDED.tier,
      rank = EXCLUDED.rank,
      updated_at = NOW();
    
    v_rank := v_rank + 1;
  END LOOP;

  -- If user_xp is empty, populate from user_stats
  IF NOT EXISTS (SELECT 1 FROM public.leaderboards LIMIT 1) THEN
    v_rank := 1;
    
    FOR v_user IN
      SELECT 
        us.user_id,
        us.total_xp,
        CASE 
          WHEN us.total_xp >= 7501 THEN 5
          WHEN us.total_xp >= 3501 THEN 4
          WHEN us.total_xp >= 1501 THEN 3
          WHEN us.total_xp >= 501 THEN 2
          ELSE 1
        END as calculated_tier
      FROM public.user_stats us
      WHERE us.total_xp > 0
      ORDER BY us.total_xp DESC
    LOOP
      INSERT INTO public.leaderboards (user_id, total_xp, tier, rank)
      VALUES (v_user.user_id, v_user.total_xp, v_user.calculated_tier, v_rank)
      ON CONFLICT (user_id) DO UPDATE SET
        total_xp = EXCLUDED.total_xp,
        tier = EXCLUDED.tier,
        rank = EXCLUDED.rank,
        updated_at = NOW();
      
      v_rank := v_rank + 1;
    END LOOP;
  END IF;

  RAISE NOTICE 'Leaderboard updated with % users', v_rank - 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard (for API)
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_tier_filter INTEGER DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  total_xp INTEGER,
  tier INTEGER,
  rank INTEGER,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.user_id,
    p.full_name,
    p.email,
    l.total_xp,
    l.tier,
    l.rank,
    p.avatar_url
  FROM public.leaderboards l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE (p_tier_filter IS NULL OR l.tier = p_tier_filter)
  ORDER BY l.rank ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update leaderboard when user_xp changes
CREATE OR REPLACE FUNCTION trigger_update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Update leaderboard ranks asynchronously (or sync if preferred)
  PERFORM update_leaderboard_ranks();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (commented out to avoid performance issues - call manually or via cron)
-- DROP TRIGGER IF EXISTS update_leaderboard_on_xp_change ON user_xp;
-- CREATE TRIGGER update_leaderboard_on_xp_change
--   AFTER INSERT OR UPDATE OF total_xp ON user_xp
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_update_leaderboard();

-- Initial population
SELECT update_leaderboard_ranks();

