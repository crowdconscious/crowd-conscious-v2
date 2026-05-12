-- =====================================================
-- REVIEW SYSTEM FOR MODULES AND COMMUNITIES
-- =====================================================
-- Purpose: Allow users to rate and review modules and communities
-- =====================================================

-- =====================================================
-- PART 1: MODULE REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS module_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What is being reviewed
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  
  -- Who is reviewing
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  
  -- Review details
  would_recommend BOOLEAN DEFAULT TRUE,
  completion_status TEXT CHECK (completion_status IN ('completed', 'in_progress', 'not_started')) DEFAULT 'completed',
  
  -- Helpfulness (voted by other users)
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_verified_purchase BOOLEAN DEFAULT FALSE, -- Did they actually buy/enroll?
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  admin_response TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reviews
  UNIQUE(module_id, user_id)
);

-- Module review helpfulness tracking
CREATE TABLE IF NOT EXISTS module_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES module_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User can only vote once per review
  UNIQUE(review_id, user_id)
);

-- =====================================================
-- PART 2: COMMUNITY REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What is being reviewed
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
  
  -- Who is reviewing
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  
  -- Specific ratings (optional, for detailed feedback)
  impact_rating INTEGER CHECK (impact_rating >= 1 AND impact_rating <= 5),
  transparency_rating INTEGER CHECK (transparency_rating >= 1 AND transparency_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  
  -- Review details
  would_recommend BOOLEAN DEFAULT TRUE,
  member_status TEXT CHECK (member_status IN ('current_member', 'past_member', 'supporter', 'observer')) DEFAULT 'observer',
  
  -- Helpfulness
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_verified_member BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  community_response TEXT, -- Community admin can respond
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reviews
  UNIQUE(community_id, user_id)
);

-- Community review helpfulness tracking
CREATE TABLE IF NOT EXISTS community_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES community_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('helpful', 'not_helpful')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(review_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Module reviews indexes
CREATE INDEX IF NOT EXISTS idx_module_reviews_module ON module_reviews(module_id);
CREATE INDEX IF NOT EXISTS idx_module_reviews_user ON module_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_module_reviews_rating ON module_reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_module_reviews_created ON module_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_reviews_helpful ON module_reviews(helpful_count DESC);

-- Community reviews indexes
CREATE INDEX IF NOT EXISTS idx_community_reviews_community ON community_reviews(community_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_user ON community_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_rating ON community_reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_community_reviews_created ON community_reviews(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update module average rating
CREATE OR REPLACE FUNCTION update_module_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_modules
  SET 
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM module_reviews
      WHERE module_id = NEW.module_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM module_reviews
      WHERE module_id = NEW.module_id
    ),
    updated_at = NOW()
  WHERE id = NEW.module_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update module ratings
DROP TRIGGER IF EXISTS trigger_update_module_rating ON module_reviews;
CREATE TRIGGER trigger_update_module_rating
  AFTER INSERT OR UPDATE OR DELETE ON module_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_module_avg_rating();

-- Function to update community average rating
CREATE OR REPLACE FUNCTION update_community_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Add or update avg_rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' AND column_name = 'avg_rating'
  ) THEN
    ALTER TABLE communities ADD COLUMN avg_rating DECIMAL(3,2) DEFAULT 0.0;
    ALTER TABLE communities ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;
  
  UPDATE communities
  SET 
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM community_reviews
      WHERE community_id = NEW.community_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM community_reviews
      WHERE community_id = NEW.community_id
    )
  WHERE id = NEW.community_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update community ratings
DROP TRIGGER IF EXISTS trigger_update_community_rating ON community_reviews;
CREATE TRIGGER trigger_update_community_rating
  AFTER INSERT OR UPDATE OR DELETE ON community_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_community_avg_rating();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Module reviews RLS
ALTER TABLE module_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can read module reviews" ON module_reviews
  FOR SELECT USING (TRUE);

-- Users can create reviews if they're enrolled
CREATE POLICY "Users can create module reviews" ON module_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE user_id = auth.uid() AND module_id = module_reviews.module_id
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own module reviews" ON module_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own module reviews" ON module_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Community reviews RLS
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read community reviews
CREATE POLICY "Anyone can read community reviews" ON community_reviews
  FOR SELECT USING (TRUE);

-- Members can create reviews
CREATE POLICY "Members can create community reviews" ON community_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_members
      WHERE user_id = auth.uid() AND community_id = community_reviews.community_id
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own community reviews" ON community_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own community reviews" ON community_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Review votes RLS
ALTER TABLE module_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review votes" ON module_review_votes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can vote on reviews" ON module_review_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read community review votes" ON community_review_votes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can vote on community reviews" ON community_review_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Note: Run this manually if you want test data
-- INSERT INTO module_reviews (module_id, user_id, rating, title, review_text, would_recommend, is_verified_purchase)
-- VALUES (
--   (SELECT id FROM marketplace_modules WHERE is_platform_module = TRUE LIMIT 1),
--   auth.uid(),
--   5,
--   'Excelente módulo!',
--   'Aprendí muchísimo sobre calidad del aire. Las herramientas prácticas son muy útiles.',
--   TRUE,
--   TRUE
-- );

-- =====================================================
-- PERMISSIONS
-- =====================================================

GRANT SELECT ON module_reviews TO authenticated;
GRANT INSERT ON module_reviews TO authenticated;
GRANT UPDATE ON module_reviews TO authenticated;
GRANT DELETE ON module_reviews TO authenticated;

GRANT SELECT ON community_reviews TO authenticated;
GRANT INSERT ON community_reviews TO authenticated;
GRANT UPDATE ON community_reviews TO authenticated;
GRANT DELETE ON community_reviews TO authenticated;

GRANT ALL ON module_review_votes TO authenticated;
GRANT ALL ON community_review_votes TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 REVIEW SYSTEM CREATED SUCCESSFULLY!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Module reviews table created';
  RAISE NOTICE '✅ Community reviews table created';
  RAISE NOTICE '✅ Review votes tracking enabled';
  RAISE NOTICE '✅ Auto-update triggers configured';
  RAISE NOTICE '✅ RLS policies set up';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Features enabled:';
  RAISE NOTICE '- Users can rate modules 1-5 stars';
  RAISE NOTICE '- Users can write detailed reviews';
  RAISE NOTICE '- Reviews update average ratings automatically';
  RAISE NOTICE '- Other users can mark reviews as helpful';
  RAISE NOTICE '- Only enrolled users can review modules';
  RAISE NOTICE '- Only community members can review communities';
  RAISE NOTICE '';
END $$;

