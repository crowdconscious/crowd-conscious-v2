-- Add media fields to communities table
-- Following rebuild strategy: simple, lean database updates

-- Add media columns to communities (one at a time for PostgreSQL compatibility)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS media_path TEXT;

-- Create storage buckets (run these in Supabase dashboard)
-- Storage > Create bucket: 'community-images'
-- Storage > Create bucket: 'content-media' 
-- Storage > Create bucket: 'profile-pictures'

-- Set up storage policies for public read access
-- Policy name: 'Public read access'
-- Policy definition: (bucket_id = 'community-images'::text) OR (bucket_id = 'content-media'::text) OR (bucket_id = 'profile-pictures'::text)

-- Policy for authenticated uploads
-- Policy name: 'Authenticated users can upload'
-- Policy definition: (auth.role() = 'authenticated'::text)

-- Add media fields to community_content table for events/challenges
ALTER TABLE community_content ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Add external responses table for non-logged user interactions
CREATE TABLE IF NOT EXISTS external_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES community_content(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('poll_vote', 'event_rsvp', 'need_interest')),
  respondent_name TEXT NOT NULL,
  respondent_email TEXT NOT NULL,
  response_data JSONB DEFAULT '{}',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_external_responses_content_id ON external_responses(content_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_email ON external_responses(respondent_email);

-- RLS policies for external_responses
ALTER TABLE external_responses ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for external forms)
CREATE POLICY "Allow external response submissions" ON external_responses
  FOR INSERT WITH CHECK (true);

-- Allow community admins to read responses
CREATE POLICY "Community admins can read responses" ON external_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = (
        SELECT community_id FROM community_content 
        WHERE id = content_id
      )
      AND user_id = auth.uid()
      AND role IN ('founder', 'admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE external_responses IS 'Stores responses from non-authenticated users via external forms';
COMMENT ON COLUMN communities.logo_url IS 'URL to community logo image in storage';
COMMENT ON COLUMN communities.banner_url IS 'URL to community banner image in storage';
COMMENT ON COLUMN communities.media_path IS 'Storage path prefix for community media files';
