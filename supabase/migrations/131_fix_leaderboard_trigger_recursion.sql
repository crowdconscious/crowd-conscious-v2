-- Fix "stack depth limit exceeded" when placing predictions
-- The trigger update_ranks_after_xp_change fires on leaderboards INSERT/UPDATE.
-- update_leaderboard_ranks() does UPDATE leaderboards, which re-fires the trigger = infinite recursion.
-- Fix: Skip execution when already inside a trigger (pg_trigger_depth() > 1).

CREATE OR REPLACE FUNCTION trigger_update_leaderboard_ranks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent recursive trigger execution (UPDATE in update_leaderboard_ranks would re-fire this)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM update_leaderboard_ranks();
  RETURN NEW;
END;
$$;
