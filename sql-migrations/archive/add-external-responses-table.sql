-- Create external responses table for public participation
CREATE TABLE IF NOT EXISTS external_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES community_content(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('poll_vote', 'event_rsvp', 'need_support')),
  response_data JSONB NOT NULL,
  respondent_email TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_responses_content_id ON external_responses(content_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_email ON external_responses(respondent_email);
CREATE INDEX IF NOT EXISTS idx_external_responses_type ON external_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_external_responses_created_at ON external_responses(created_at);

-- Create composite index for duplicate checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_responses_unique_poll_vote 
ON external_responses(content_id, respondent_email) 
WHERE response_type = 'poll_vote';

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_responses_unique_event_rsvp 
ON external_responses(content_id, respondent_email) 
WHERE response_type = 'event_rsvp';

-- Enable RLS
ALTER TABLE external_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can insert external responses" ON external_responses
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Content creators can view responses to their content" ON external_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_content cc
      WHERE cc.id = content_id 
      AND cc.created_by = auth.uid()
    )
  );

CREATE POLICY "Community members can view responses in their communities" ON external_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_content cc
      JOIN community_members cm ON cm.community_id = cc.community_id
      WHERE cc.id = content_id 
      AND cm.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_external_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_external_responses_updated_at ON external_responses;
CREATE TRIGGER update_external_responses_updated_at
  BEFORE UPDATE ON external_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_external_responses_updated_at();

-- Add some sample data for testing (optional)
-- INSERT INTO external_responses (content_id, response_type, response_data, respondent_email, respondent_name)
-- VALUES 
-- (
--   'some-content-id',
--   'poll_vote',
--   '{"poll_option_id": "option-1", "additional_comments": "Great idea!"}',
--   'test@example.com',
--   'Test User'
-- );

COMMENT ON TABLE external_responses IS 'Stores responses from non-logged-in users for polls, events, and needs';
COMMENT ON COLUMN external_responses.response_data IS 'JSON data specific to response type (poll_option_id, rsvp_status, support_details, etc.)';
COMMENT ON COLUMN external_responses.response_type IS 'Type of response: poll_vote, event_rsvp, or need_support';
