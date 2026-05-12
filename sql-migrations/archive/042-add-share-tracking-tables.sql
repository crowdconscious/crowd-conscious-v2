-- Migration: Add Share Tracking Tables
-- Description: Add tables to track content shares and clicks for viral growth metrics
-- Date: 2025-10-21

-- =====================================================
-- SHARE TRACKING TABLES
-- =====================================================

-- Track when users share content
CREATE TABLE IF NOT EXISTS public.content_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES community_content(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  platform text NOT NULL, -- 'twitter', 'facebook', 'linkedin', 'whatsapp', 'email', 'copy', 'link'
  created_at timestamptz DEFAULT now()
);

-- Track when shared links are clicked
CREATE TABLE IF NOT EXISTS public.share_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES community_content(id) ON DELETE CASCADE NOT NULL,
  clicked_at timestamptz DEFAULT now(),
  referrer text, -- Where the click came from
  converted boolean DEFAULT false, -- Did they sign up?
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL -- If they signed up, link to their profile
);

-- Track referrals (who referred who)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  source_content_id uuid REFERENCES community_content(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referee_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_content_shares_content_id ON public.content_shares(content_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_user_id ON public.content_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_platform ON public.content_shares(platform);
CREATE INDEX IF NOT EXISTS idx_content_shares_created_at ON public.content_shares(created_at);

CREATE INDEX IF NOT EXISTS idx_share_clicks_content_id ON public.share_clicks(content_id);
CREATE INDEX IF NOT EXISTS idx_share_clicks_clicked_at ON public.share_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_share_clicks_converted ON public.share_clicks(converted);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON public.referrals(created_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE public.content_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Content shares: Anyone can view, only authenticated users can insert
CREATE POLICY "Anyone can view content shares"
  ON public.content_shares
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shares"
  ON public.content_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Share clicks: Anyone can insert (track clicks from non-logged-in users)
CREATE POLICY "Anyone can view share clicks"
  ON public.share_clicks
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can track clicks"
  ON public.share_clicks
  FOR INSERT
  WITH CHECK (true);

-- Referrals: Users can view their own referrals
CREATE POLICY "Users can view their referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "System can create referrals"
  ON public.referrals
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- FUNCTIONS FOR ANALYTICS
-- =====================================================

-- Function to get share stats for content
CREATE OR REPLACE FUNCTION get_content_share_stats(content_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_shares_count int;
  total_clicks_count int;
  converted_count int;
  conv_rate numeric;
  platform_stats json;
BEGIN
  -- Get total shares
  SELECT COUNT(*) INTO total_shares_count
  FROM content_shares
  WHERE content_id = content_uuid;
  
  -- Get total clicks
  SELECT COUNT(*) INTO total_clicks_count
  FROM share_clicks
  WHERE content_id = content_uuid;
  
  -- Get converted count
  SELECT COUNT(*) INTO converted_count
  FROM share_clicks
  WHERE content_id = content_uuid AND converted = true;
  
  -- Calculate conversion rate
  IF total_clicks_count > 0 THEN
    conv_rate := ROUND((converted_count::numeric / total_clicks_count::numeric) * 100, 2);
  ELSE
    conv_rate := 0;
  END IF;
  
  -- Get shares by platform
  SELECT COALESCE(json_object_agg(platform, count), '{}'::json)
  INTO platform_stats
  FROM (
    SELECT platform, COUNT(*) as count
    FROM content_shares
    WHERE content_id = content_uuid
    GROUP BY platform
  ) platform_counts;
  
  -- Build result
  result := json_build_object(
    'total_shares', total_shares_count,
    'total_clicks', total_clicks_count,
    'conversions', converted_count,
    'conversion_rate', conv_rate,
    'shares_by_platform', platform_stats
  );
  
  RETURN result;
END;
$$;

-- Function to get user's referral stats
CREATE OR REPLACE FUNCTION get_user_referral_stats(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  WITH recent_referrals AS (
    SELECT 
      p.full_name as referee_name,
      r.created_at,
      cc.title as content_title
    FROM referrals r
    LEFT JOIN profiles p ON p.id = r.referee_id
    LEFT JOIN community_content cc ON cc.id = r.source_content_id
    WHERE r.referrer_id = user_uuid
    ORDER BY r.created_at DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'total_referrals', (SELECT COUNT(*) FROM referrals WHERE referrer_id = user_uuid),
    'recent_referrals', COALESCE(json_agg(
      json_build_object(
        'referee_name', referee_name,
        'created_at', created_at,
        'content_title', content_title
      )
    ), '[]'::json)
  )
  INTO result
  FROM recent_referrals;
  
  RETURN result;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.content_shares IS 'Tracks when users share content to social platforms';
COMMENT ON TABLE public.share_clicks IS 'Tracks clicks on shared links for viral growth metrics';
COMMENT ON TABLE public.referrals IS 'Tracks user referrals and their sources';

COMMENT ON FUNCTION get_content_share_stats IS 'Returns share statistics for a given content item';
COMMENT ON FUNCTION get_user_referral_stats IS 'Returns referral statistics for a given user';

