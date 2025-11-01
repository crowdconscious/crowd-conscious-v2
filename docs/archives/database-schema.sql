-- Crowd Conscious - Simplified Database Schema
-- Based on rebuild strategy: Maximum 8 tables, single responsibility

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (extends Supabase Auth)
-- =====================================================
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  user_type text DEFAULT 'user' CHECK (user_type IN ('user', 'brand', 'admin')),
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 2. COMMUNITIES (with built-in location)
-- =====================================================
CREATE TABLE public.communities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  core_values text[] CHECK (array_length(core_values, 1) >= 3),
  location point,              -- PostGIS for map
  address text,
  member_count int DEFAULT 0,
  creator_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 3. COMMUNITY MEMBERS (with voting power)
-- =====================================================
CREATE TABLE public.community_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES communities(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('founder', 'admin', 'member')),
  voting_power int DEFAULT 1,   -- founder: 3, admin: 2, member: 1
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- =====================================================
-- 4. COMMUNITY CONTENT (flexible: needs, events, polls, challenges)
-- =====================================================
CREATE TABLE public.community_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES communities(id) NOT NULL,
  type text CHECK (type IN ('need', 'event', 'challenge', 'poll')) NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  data jsonb DEFAULT '{}',      -- Type-specific data
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'voting', 'approved', 'active', 'completed')),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  funding_goal decimal,         -- For needs
  current_funding decimal DEFAULT 0,
  voting_deadline timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 5. VOTES (with weighted voting)
-- =====================================================
CREATE TABLE public.votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES community_content(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  vote text CHECK (vote IN ('approve', 'reject')) NOT NULL,
  weight int DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- =====================================================
-- 6. SPONSORSHIPS (with approval workflow)
-- =====================================================
CREATE TABLE public.sponsorships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES community_content(id) NOT NULL,
  sponsor_id uuid REFERENCES profiles(id) NOT NULL,
  amount decimal NOT NULL CHECK (amount > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  stripe_payment_intent text,
  platform_fee decimal,         -- 15%
  approved_by_community boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 7. IMPACT METRICS (measurable outcomes)
-- =====================================================
CREATE TABLE public.impact_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES communities(id) NOT NULL,
  content_id uuid REFERENCES community_content(id),
  metric_type text CHECK (metric_type IN ('clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade')) NOT NULL,
  value decimal NOT NULL,
  unit text NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 8. SHARE LINKS (public access)
-- =====================================================
CREATE TABLE public.share_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text UNIQUE DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES community_content(id) NOT NULL,
  type text CHECK (type IN ('poll', 'event', 'post')) NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Communities: Public read, authenticated create
CREATE POLICY "Anyone can view communities" ON communities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities" ON communities
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update communities" ON communities
  FOR UPDATE USING (auth.uid() = creator_id);

-- Members: Community-based access
CREATE POLICY "Anyone can view community members" ON community_members
  FOR SELECT USING (true);

CREATE POLICY "Users can join communities" ON community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content: Members can create, all can read
CREATE POLICY "Anyone can view community content" ON community_content
  FOR SELECT USING (true);

CREATE POLICY "Community members can create content" ON community_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_content.community_id
      AND user_id = auth.uid()
    )
  );

-- Voting: Members only with weight
CREATE POLICY "Community members can vote" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members cm
      JOIN community_content cc ON cc.id = content_id
      WHERE cm.community_id = cc.community_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view votes" ON votes
  FOR SELECT USING (true);

-- Sponsorships: Brands can create, community approves
CREATE POLICY "Anyone can view sponsorships" ON sponsorships
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sponsorships" ON sponsorships
  FOR INSERT WITH CHECK (auth.uid() = sponsor_id);

CREATE POLICY "Community members can approve sponsorships" ON sponsorships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      JOIN community_content cc ON cc.id = content_id
      WHERE cm.community_id = cc.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder', 'admin')
    )
  );

-- Impact metrics: Community members can add
CREATE POLICY "Anyone can view impact metrics" ON impact_metrics
  FOR SELECT USING (true);

CREATE POLICY "Community members can add metrics" ON impact_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = impact_metrics.community_id
      AND user_id = auth.uid()
    )
  );

-- Share links: Content creators can create
CREATE POLICY "Anyone can view share links" ON share_links
  FOR SELECT USING (true);

CREATE POLICY "Content creators can create share links" ON share_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_content
      WHERE id = content_id
      AND created_by = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update member count
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = member_count - 1 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update member count
CREATE TRIGGER member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_member_count();

-- Function to set voting weight based on role
CREATE OR REPLACE FUNCTION set_voting_weight()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.role
    WHEN 'founder' THEN NEW.voting_power = 3;
    WHEN 'admin' THEN NEW.voting_power = 2;
    ELSE NEW.voting_power = 1;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set voting power
CREATE TRIGGER voting_weight_trigger
  BEFORE INSERT OR UPDATE ON community_members
  FOR EACH ROW EXECUTE FUNCTION set_voting_weight();

-- =====================================================
-- SAMPLE DATA REMOVED - Use real user-generated content only
-- =====================================================
