-- Conscious Inbox: user-submitted market ideas, causes, and suggestions
-- Run in Supabase SQL Editor if migrations are not applied automatically

CREATE TABLE IF NOT EXISTS conscious_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('market_idea', 'cause_proposal', 'ngo_suggestion', 'general')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  links JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'published')),
  admin_notes TEXT,
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inbox_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inbox_item_id UUID REFERENCES conscious_inbox(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inbox_item_id, user_id)
);

CREATE OR REPLACE FUNCTION increment_inbox_upvote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conscious_inbox SET upvotes = upvotes + 1, updated_at = NOW()
  WHERE id = NEW.inbox_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_inbox_vote_insert ON inbox_votes;
CREATE TRIGGER on_inbox_vote_insert
AFTER INSERT ON inbox_votes
FOR EACH ROW EXECUTE FUNCTION increment_inbox_upvote();

CREATE OR REPLACE FUNCTION decrement_inbox_upvote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conscious_inbox SET upvotes = upvotes - 1, updated_at = NOW()
  WHERE id = OLD.inbox_item_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_inbox_vote_delete ON inbox_votes;
CREATE TRIGGER on_inbox_vote_delete
AFTER DELETE ON inbox_votes
FOR EACH ROW EXECUTE FUNCTION decrement_inbox_upvote();

ALTER TABLE conscious_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read inbox" ON conscious_inbox;
CREATE POLICY "Anyone can read inbox" ON conscious_inbox FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can submit" ON conscious_inbox;
CREATE POLICY "Users can submit" ON conscious_inbox FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update" ON conscious_inbox;
CREATE POLICY "Admin can update" ON conscious_inbox FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
);

DROP POLICY IF EXISTS "Anyone can read votes" ON inbox_votes;
CREATE POLICY "Anyone can read votes" ON inbox_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote" ON inbox_votes;
CREATE POLICY "Users can vote" ON inbox_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unvote" ON inbox_votes;
CREATE POLICY "Users can unvote" ON inbox_votes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conscious_inbox_upvotes ON conscious_inbox(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_conscious_inbox_type ON conscious_inbox(type);
CREATE INDEX IF NOT EXISTS idx_conscious_inbox_created ON conscious_inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_votes_item_user ON inbox_votes(inbox_item_id, user_id);
