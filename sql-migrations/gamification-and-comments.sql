-- Gamification and Comments System Migration
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- USER STATS TABLE FOR GAMIFICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  votes_cast INTEGER DEFAULT 0,
  content_created INTEGER DEFAULT 0,
  events_attended INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0,
  achievements_unlocked TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for user_stats
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_xp ON user_stats(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_level ON user_stats(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_activity ON user_stats(last_activity DESC);

-- ============================================================================
-- COMMENTS TABLE FOR DISCUSSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES community_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  mentions TEXT[] DEFAULT '{}',
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- WEEKLY CHALLENGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('votes', 'content', 'comments', 'events', 'streak')),
  target_value INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User challenge progress tracking
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- ============================================================================
-- XP TRANSACTION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('vote_cast', 'content_created', 'content_approved', 'event_rsvp', 'event_attended', 'comment_posted', 'reaction_given', 'daily_login', 'streak_bonus', 'achievement_unlocked', 'challenge_completed')),
  xp_amount INTEGER NOT NULL,
  related_id UUID, -- ID of the related content, vote, comment, etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for xp_transactions
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_action_type ON xp_transactions(action_type);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- User Stats Policies
DROP POLICY IF EXISTS "Users can view all user stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

CREATE POLICY "Users can view all user stats" ON user_stats
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Comments Policies
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Weekly Challenges Policies
DROP POLICY IF EXISTS "Anyone can view challenges" ON weekly_challenges;

CREATE POLICY "Anyone can view challenges" ON weekly_challenges
  FOR SELECT USING (TRUE);

-- User Challenge Progress Policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_challenge_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_challenge_progress;

CREATE POLICY "Users can view own progress" ON user_challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_challenge_progress
  FOR ALL USING (auth.uid() = user_id);

-- XP Transactions Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON xp_transactions;

CREATE POLICY "Users can view own transactions" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_action_type TEXT,
  p_xp_amount INTEGER,
  p_related_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_total_xp INTEGER;
  new_total_xp INTEGER;
  old_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Insert XP transaction
  INSERT INTO xp_transactions (user_id, action_type, xp_amount, related_id, description)
  VALUES (p_user_id, p_action_type, p_xp_amount, p_related_id, p_description);
  
  -- Update user stats
  INSERT INTO user_stats (user_id, total_xp, level, last_activity)
  VALUES (p_user_id, p_xp_amount, 1, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = user_stats.total_xp + p_xp_amount,
    level = FLOOR(SQRT((user_stats.total_xp + p_xp_amount) / 100.0)) + 1,
    last_activity = NOW(),
    updated_at = NOW();
    
  -- Check for level up and award achievement
  SELECT total_xp, level INTO current_total_xp, old_level
  FROM user_stats WHERE user_id = p_user_id;
  
  new_total_xp := current_total_xp;
  new_level := FLOOR(SQRT(new_total_xp / 100.0)) + 1;
  
  -- If level increased, award level achievement
  IF new_level > old_level THEN
    -- Add level achievement to achievements_unlocked array
    UPDATE user_stats
    SET achievements_unlocked = array_append(achievements_unlocked, 'level_' || new_level::text)
    WHERE user_id = p_user_id
    AND NOT (achievements_unlocked @> ARRAY['level_' || new_level::text]);
    
    -- Award bonus XP for leveling up
    INSERT INTO xp_transactions (user_id, action_type, xp_amount, description)
    VALUES (p_user_id, 'achievement_unlocked', 100, 'Reached level ' || new_level);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streaks
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  last_activity_date DATE;
  current_streak INTEGER;
  longest_streak INTEGER;
  streak_bonus INTEGER;
BEGIN
  -- Get current stats
  SELECT 
    DATE(last_activity),
    user_stats.current_streak,
    user_stats.longest_streak
  INTO last_activity_date, current_streak, longest_streak
  FROM user_stats 
  WHERE user_id = p_user_id;
  
  -- Check if this is a new day
  IF last_activity_date IS NULL OR last_activity_date < CURRENT_DATE THEN
    -- Check if streak continues (yesterday) or breaks
    IF last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Continue streak
      current_streak := current_streak + 1;
      longest_streak := GREATEST(longest_streak, current_streak);
      
      -- Award streak bonus XP
      streak_bonus := current_streak * 5; -- 5 XP per day in streak
      PERFORM award_xp(p_user_id, 'streak_bonus', streak_bonus, NULL, current_streak || ' day streak');
      
    ELSIF last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN
      -- Streak broken, reset to 1
      current_streak := 1;
      PERFORM award_xp(p_user_id, 'daily_login', 10, NULL, 'Daily login');
      
    ELSE
      -- Same day, just update activity time
      current_streak := GREATEST(current_streak, 1);
    END IF;
    
    -- Update user stats
    UPDATE user_stats
    SET 
      current_streak = update_user_streak.current_streak,
      longest_streak = update_user_streak.longest_streak,
      last_activity = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_stat RECORD;
  achievement_unlocked BOOLEAN := FALSE;
BEGIN
  -- Get current user stats
  SELECT * INTO user_stat FROM user_stats WHERE user_id = p_user_id;
  
  IF user_stat IS NULL THEN
    RETURN;
  END IF;
  
  -- Check various achievements
  
  -- First vote achievement
  IF user_stat.votes_cast >= 1 AND NOT (user_stat.achievements_unlocked @> ARRAY['first_vote']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'first_vote')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, 'First Vote achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  -- Vote champion achievement (50 votes)
  IF user_stat.votes_cast >= 50 AND NOT (user_stat.achievements_unlocked @> ARRAY['vote_champion']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'vote_champion')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, 'Vote Champion achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  -- Content creator achievement
  IF user_stat.content_created >= 1 AND NOT (user_stat.achievements_unlocked @> ARRAY['content_creator']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'content_creator')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, 'Content Creator achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  -- Prolific creator achievement (10 content pieces)
  IF user_stat.content_created >= 10 AND NOT (user_stat.achievements_unlocked @> ARRAY['prolific_creator']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'prolific_creator')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, 'Prolific Creator achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  -- Streak achievements
  IF user_stat.current_streak >= 3 AND NOT (user_stat.achievements_unlocked @> ARRAY['streak_3']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'streak_3')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, '3-day streak achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  IF user_stat.current_streak >= 7 AND NOT (user_stat.achievements_unlocked @> ARRAY['streak_7']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'streak_7')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, '7-day streak achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  -- Social achievements
  IF user_stat.events_attended >= 5 AND NOT (user_stat.achievements_unlocked @> ARRAY['social_butterfly']) THEN
    UPDATE user_stats 
    SET achievements_unlocked = array_append(achievements_unlocked, 'social_butterfly')
    WHERE user_id = p_user_id;
    PERFORM award_xp(p_user_id, 'achievement_unlocked', 100, NULL, 'Social Butterfly achievement unlocked');
    achievement_unlocked := TRUE;
  END IF;
  
  -- If any achievement was unlocked, send notification
  IF achievement_unlocked THEN
    -- This would call the notification function if it exists
    -- PERFORM create_notification(p_user_id, 'achievement_unlocked', 'New Achievement!', 'You unlocked a new achievement! 🏆');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC XP REWARDS
-- ============================================================================

-- Award XP when user votes
CREATE OR REPLACE FUNCTION trigger_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for voting
  PERFORM award_xp(NEW.user_id, 'vote_cast', 5, NEW.content_id, 'Voted on content');
  
  -- Update vote count in user stats
  UPDATE user_stats 
  SET votes_cast = votes_cast + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements
  PERFORM update_user_streak(NEW.user_id);
  PERFORM check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vote_xp ON votes;
CREATE TRIGGER trigger_vote_xp
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vote_xp();

-- Award XP when user creates content
CREATE OR REPLACE FUNCTION trigger_content_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for creating content
  PERFORM award_xp(NEW.created_by, 'content_created', 25, NEW.id, 'Created ' || NEW.type);
  
  -- Update content count in user stats
  UPDATE user_stats 
  SET content_created = content_created + 1,
      updated_at = NOW()
  WHERE user_id = NEW.created_by;
  
  -- Update streak and check achievements
  PERFORM update_user_streak(NEW.created_by);
  PERFORM check_achievements(NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_content_xp ON community_content;
CREATE TRIGGER trigger_content_xp
  AFTER INSERT ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_xp();

-- Award XP when user posts comments
CREATE OR REPLACE FUNCTION trigger_comment_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for commenting
  PERFORM award_xp(NEW.user_id, 'comment_posted', 3, NEW.id, 'Posted comment');
  
  -- Update comment count in user stats
  UPDATE user_stats 
  SET comments_posted = comments_posted + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements
  PERFORM update_user_streak(NEW.user_id);
  PERFORM check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_xp ON comments;
CREATE TRIGGER trigger_comment_xp
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_xp();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert a sample weekly challenge
INSERT INTO weekly_challenges (title, description, icon, challenge_type, target_value, reward_xp, start_date, end_date, is_active)
VALUES (
  'Democracy Week',
  'Cast 10 votes this week to earn bonus XP and show your civic engagement!',
  '🗳️',
  'votes',
  10,
  200,
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER, -- Start of current week
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + INTERVAL '6 days', -- End of current week
  TRUE
)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Gamification and Comments system setup completed successfully! 🎮';
  RAISE NOTICE 'Users will now earn XP for actions and unlock achievements.';
  RAISE NOTICE 'Comments system is ready for rich discussions with @mentions and reactions.';
END $$;
