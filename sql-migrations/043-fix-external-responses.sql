-- Migration Fix: External Responses Table
-- Description: Fix missing column and simplify policies
-- Date: 2025-01-21

-- Drop the table if it exists and recreate it properly
DROP TABLE IF EXISTS public.external_responses CASCADE;

-- Create the table with all columns
CREATE TABLE public.external_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES community_content(id) ON DELETE CASCADE NOT NULL,
  response_type text NOT NULL,
  response_data jsonb NOT NULL,
  respondent_email text NOT NULL,
  respondent_name text NOT NULL,
  respondent_phone text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_external_responses_content_id ON public.external_responses(content_id);
CREATE INDEX idx_external_responses_email ON public.external_responses(respondent_email);
CREATE INDEX idx_external_responses_type ON public.external_responses(response_type);
CREATE INDEX idx_external_responses_created_at ON public.external_responses(created_at);

-- Enable RLS
ALTER TABLE public.external_responses ENABLE ROW LEVEL SECURITY;

-- Simple policies that work
CREATE POLICY "Anyone can view external responses"
  ON public.external_responses
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit external responses"
  ON public.external_responses
  FOR INSERT
  WITH CHECK (true);

-- Helper functions
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

-- Comments
COMMENT ON TABLE public.external_responses IS 'Stores responses from non-logged-in users (RSVPs, votes, etc.)';
COMMENT ON COLUMN public.external_responses.response_type IS 'Type of response: event_rsvp, poll_vote, need_support';
COMMENT ON COLUMN public.external_responses.response_data IS 'Flexible JSONB storage for response details';

