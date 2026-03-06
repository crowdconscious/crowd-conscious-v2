-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('market_resolved', 'inbox_upvote', 'xp_earned', 'fund_vote_available')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- INSERT: use createAdminClient() in API routes to bypass RLS when creating notifications

-- Market comments table
CREATE TABLE IF NOT EXISTS market_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id UUID REFERENCES prediction_markets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_comments_market ON market_comments(market_id);
CREATE INDEX IF NOT EXISTS idx_market_comments_created ON market_comments(created_at ASC);

ALTER TABLE market_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments" ON market_comments;
CREATE POLICY "Anyone can read comments" ON market_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON market_comments;
CREATE POLICY "Authenticated users can comment" ON market_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
