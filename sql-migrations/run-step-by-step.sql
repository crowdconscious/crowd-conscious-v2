-- Media Fields Migration - Step by Step
-- Run these commands one at a time in your Supabase SQL editor

-- Step 1: Add logo_url column
ALTER TABLE communities ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Step 2: Add banner_url column  
ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Step 3: Add media_path column
ALTER TABLE communities ADD COLUMN IF NOT EXISTS media_path TEXT;

-- Step 4: Add media_urls array to community_content
ALTER TABLE community_content ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Step 5: Create external_responses table
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

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_responses_content_id ON external_responses(content_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_email ON external_responses(respondent_email);

-- Step 7: Enable RLS on external_responses
ALTER TABLE external_responses ENABLE ROW LEVEL SECURITY;

-- Step 8: Allow public inserts (for external forms)
CREATE POLICY "Allow external response submissions" ON external_responses
  FOR INSERT WITH CHECK (true);

-- Step 9: Allow community admins to read responses
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

-- Step 10: Add helpful comments
COMMENT ON TABLE external_responses IS 'Stores responses from non-authenticated users via external forms';
COMMENT ON COLUMN communities.logo_url IS 'URL to community logo image in storage';
COMMENT ON COLUMN communities.banner_url IS 'URL to community banner image in storage';
COMMENT ON COLUMN communities.media_path IS 'Storage path prefix for community media files';
