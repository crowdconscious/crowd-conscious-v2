-- =====================================================
-- PHASE 7: GAMIFICATION SCHEMA
-- This migration creates all tables and functions needed
-- for the comprehensive gamification system.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. USER XP AND TIER TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_tier INTEGER NOT NULL DEFAULT 1 CHECK (current_tier >= 1 AND current_tier <= 5),
  tier_progress DECIMAL(5,2) NOT NULL DEFAULT 0.0 CHECK (tier_progress >= 0 AND tier_progress <= 100),
  xp_to_next_tier INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 2. XP TRANSACTION HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_id UUID, -- Reference to the action (lesson_id, module_id, sponsorship_id, etc.)
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. USER ACHIEVEMENTS/BADGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  icon_url TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- =====================================================
-- 4. USER PREFERENCES (FOR TIER THEMES)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_tier INTEGER NOT NULL DEFAULT 1 CHECK (theme_tier >= 1 AND theme_tier <= 5),
  celebration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  haptic_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 5. STREAK TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 6. LEADERBOARDS (OPTIONAL, FOR COMPETITIVE ASPECT)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 7. XP REWARDS CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.xp_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL UNIQUE,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default XP rewards
INSERT INTO public.xp_rewards (action_type, xp_amount, description) VALUES
  ('lesson_completed', 50, 'Complete a lesson'),
  ('module_completed', 200, 'Complete an entire module'),
  ('sponsor_need', 100, 'Sponsor a community need'),
  ('vote_content', 25, 'Vote on community content'),
  ('create_content', 75, 'Create community content'),
  ('daily_login', 10, 'Daily login streak'),
  ('week_streak', 50, '7-day streak bonus'),
  ('month_streak', 200, '30-day streak bonus'),
  ('first_module', 100, 'Complete your first module'),
  ('first_sponsor', 150, 'Make your first sponsorship'),
  ('review_module', 30, 'Leave a module review'),
  ('share_achievement', 20, 'Share an achievement'),
  ('certificate_earned', 150, 'Earn a module certificate')
ON CONFLICT (action_type) DO NOTHING;

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON public.user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_action_type ON public.xp_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_leaderboards_total_xp ON public.leaderboards(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_tier ON public.leaderboards(tier DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON public.leaderboards(rank);

-- =====================================================
-- 9. FUNCTIONS FOR XP MANAGEMENT
-- =====================================================

-- Function to calculate tier from XP
CREATE OR REPLACE FUNCTION calculate_tier(p_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_xp >= 7501 THEN
    RETURN 5; -- Legend
  ELSIF p_xp >= 3501 THEN
    RETURN 4; -- Impact Leader
  ELSIF p_xp >= 1501 THEN
    RETURN 3; -- Changemaker
  ELSIF p_xp >= 501 THEN
    RETURN 2; -- Contributor
  ELSE
    RETURN 1; -- Explorer
  END IF;
END;
$$;

-- Function to calculate XP needed for next tier
CREATE OR REPLACE FUNCTION xp_for_next_tier(p_current_tier INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_current_tier
    WHEN 1 THEN RETURN 501;
    WHEN 2 THEN RETURN 1501;
    WHEN 3 THEN RETURN 3501;
    WHEN 4 THEN RETURN 7501;
    ELSE RETURN NULL; -- Max tier
  END CASE;
END;
$$;

-- Function to award XP and update user tier
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_xp_amount INTEGER;
  v_new_total_xp INTEGER;
  v_new_tier INTEGER;
  v_old_tier INTEGER;
  v_xp_to_next INTEGER;
  v_tier_progress DECIMAL(5,2);
BEGIN
  -- Get XP amount for this action
  SELECT xp_amount INTO v_xp_amount
  FROM public.xp_rewards
  WHERE action_type = p_action_type;

  IF v_xp_amount IS NULL THEN
    RAISE EXCEPTION 'Unknown action type: %', p_action_type;
  END IF;

  -- Record transaction
  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (p_user_id, v_xp_amount, p_action_type, p_action_id, p_description);

  -- Update user XP
  INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
  VALUES (p_user_id, v_xp_amount, 1, 0.0, 500)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = public.user_xp.total_xp + v_xp_amount,
    updated_at = NOW();

  -- Get updated values
  SELECT total_xp, current_tier INTO v_new_total_xp, v_old_tier
  FROM public.user_xp
  WHERE user_id = p_user_id;

  -- Calculate new tier
  v_new_tier := calculate_tier(v_new_total_xp);

  -- Calculate progress to next tier
  IF v_new_tier < 5 THEN
    v_xp_to_next := xp_for_next_tier(v_new_tier);
    v_tier_progress := ((v_new_total_xp - (v_xp_to_next - 500))::DECIMAL / 500.0) * 100.0;
    IF v_tier_progress < 0 THEN v_tier_progress := 0; END IF;
    IF v_tier_progress > 100 THEN v_tier_progress := 100; END IF;
  ELSE
    v_xp_to_next := NULL;
    v_tier_progress := 100.0;
  END IF;

  -- Update tier and progress
  UPDATE public.user_xp
  SET
    current_tier = v_new_tier,
    tier_progress = v_tier_progress,
    xp_to_next_tier = COALESCE(v_xp_to_next, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Update leaderboard
  INSERT INTO public.leaderboards (user_id, total_xp, tier)
  VALUES (p_user_id, v_new_total_xp, v_new_tier)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = v_new_total_xp,
    tier = v_new_tier,
    updated_at = NOW();

  -- Return XP amount awarded
  RETURN v_xp_amount;
END;
$$;

-- Function to update leaderboard ranks
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.leaderboards l
  SET rank = subq.rank
  FROM (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_xp DESC, updated_at ASC) as rank
    FROM public.leaderboards
  ) subq
  WHERE l.user_id = subq.user_id;
END;
$$;

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Trigger to update leaderboard ranks when XP changes
CREATE OR REPLACE FUNCTION trigger_update_leaderboard_ranks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_leaderboard_ranks();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ranks_after_xp_change
AFTER INSERT OR UPDATE ON public.leaderboards
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_leaderboard_ranks();

-- =====================================================
-- 11. RLS POLICIES
-- =====================================================

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Users can only see their own XP data
CREATE POLICY "Users can view own XP" ON public.user_xp
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own XP transactions" ON public.xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

-- Public leaderboard (top 100)
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboards
  FOR SELECT USING (rank IS NOT NULL AND rank <= 100);

-- =====================================================
-- 12. INITIALIZE EXISTING USERS
-- =====================================================

-- Create user_xp entries for existing users
INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
SELECT 
  id as user_id,
  0 as total_xp,
  1 as current_tier,
  0.0 as tier_progress,
  500 as xp_to_next_tier
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Create user_preferences for existing users
INSERT INTO public.user_preferences (user_id, theme_tier, celebration_enabled, sound_enabled, haptic_enabled)
SELECT 
  id as user_id,
  1 as theme_tier,
  TRUE as celebration_enabled,
  TRUE as sound_enabled,
  TRUE as haptic_enabled
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Create user_streaks for existing users
INSERT INTO public.user_streaks (user_id, current_streak, longest_streak)
SELECT 
  id as user_id,
  0 as current_streak,
  0 as longest_streak
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

