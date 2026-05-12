-- Migration: Add External Responses Table
-- Description: Allow non-logged-in users to RSVP, vote, and participate
-- Date: 2025-01-21

-- =====================================================
-- EXTERNAL RESPONSES TABLE
-- =====================================================

-- Track responses from non-logged-in users (RSVPs, poll votes, etc.)
CREATE TABLE IF NOT EXISTS public.external_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES community_content(id) ON DELETE CASCADE NOT NULL,
  response_type text NOT NULL, -- 'event_rsvp', 'poll_vote', 'need_support'
  response_data jsonb NOT NULL, -- Flexible storage for different response types
  respondent_email text NOT NULL,
  respondent_name text NOT NULL,
  respondent_phone text,
  created_at timestamptz DEFAULT now(),
  converted_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL -- If they later sign up
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_external_responses_content_id ON public.external_responses(content_id);
CREATE INDEX IF NOT EXISTS idx_external_responses_email ON public.external_responses(respondent_email);
CREATE INDEX IF NOT EXISTS idx_external_responses_type ON public.external_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_external_responses_created_at ON public.external_responses(created_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE public.external_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can view external responses (for counting, etc.)
CREATE POLICY "Anyone can view external responses"
  ON public.external_responses
  FOR SELECT
  USING (true);

-- Anyone can insert external responses (allow non-logged-in participation)
CREATE POLICY "Anyone can submit external responses"
  ON public.external_responses
  FOR INSERT
  WITH CHECK (true);

-- Only admins can update/delete
CREATE POLICY "Admins can manage external responses"
  ON public.external_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS FOR COUNTING EXTERNAL RESPONSES
-- =====================================================

-- Function to count external RSVPs for an event
CREATE OR REPLACE FUNCTION count_external_rsvps(event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM external_responses
  WHERE content_id = event_id
  AND response_type = 'event_rsvp';
$$;

-- Function to count external poll votes for an option
CREATE OR REPLACE FUNCTION count_external_poll_votes(option_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM external_responses
  WHERE response_type = 'poll_vote'
  AND response_data->>'poll_option_id' = option_id::text;
$$;

-- Function to check if email already responded to content
CREATE OR REPLACE FUNCTION has_external_response(
  p_content_id uuid,
  p_email text,
  p_response_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM external_responses
    WHERE content_id = p_content_id
    AND respondent_email = p_email
    AND response_type = p_response_type
  );
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.external_responses IS 'Stores responses from non-logged-in users (RSVPs, votes, etc.)';
COMMENT ON COLUMN public.external_responses.response_type IS 'Type of response: event_rsvp, poll_vote, need_support';
COMMENT ON COLUMN public.external_responses.response_data IS 'Flexible JSONB storage for response details';
COMMENT ON COLUMN public.external_responses.converted_user_id IS 'Links to user profile if they later sign up';

COMMENT ON FUNCTION count_external_rsvps IS 'Counts external (non-logged-in) RSVPs for an event';
COMMENT ON FUNCTION count_external_poll_votes IS 'Counts external votes for a specific poll option';
COMMENT ON FUNCTION has_external_response IS 'Checks if an email has already responded to specific content';

