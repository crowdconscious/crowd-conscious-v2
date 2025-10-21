-- Migration: Add function to count total poll votes (authenticated + external)
-- Description: Combine authenticated user votes with external (non-logged-in) votes
-- Date: 2025-01-21

-- Function to get total votes for a poll option (authenticated + external)
CREATE OR REPLACE FUNCTION get_total_poll_votes(option_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT (
    -- Count from poll_votes (authenticated users)
    COALESCE((
      SELECT COUNT(*)
      FROM poll_votes
      WHERE poll_option_id = option_id
    ), 0)
    +
    -- Count from external_responses (non-logged-in users)
    COALESCE((
      SELECT COUNT(*)
      FROM external_responses
      WHERE response_type = 'poll_vote'
      AND response_data->>'poll_option_id' = option_id::text
    ), 0)
  )::integer;
$$;

-- Function to get poll results with total votes
CREATE OR REPLACE FUNCTION get_poll_results(content_uuid uuid)
RETURNS TABLE (
  option_id uuid,
  option_text text,
  vote_count integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    po.id as option_id,
    po.option_text,
    get_total_poll_votes(po.id) as vote_count,
    po.created_at
  FROM poll_options po
  WHERE po.content_id = content_uuid
  ORDER BY po.created_at ASC;
$$;

-- Update poll_options view to include total votes
-- This makes it transparent - existing queries just work
CREATE OR REPLACE VIEW poll_options_with_totals AS
SELECT 
  po.id,
  po.content_id,
  po.option_text,
  po.created_at,
  get_total_poll_votes(po.id) as vote_count
FROM poll_options po;

COMMENT ON FUNCTION get_total_poll_votes IS 'Returns total votes for a poll option (authenticated + external)';
COMMENT ON FUNCTION get_poll_results IS 'Returns all options for a poll with total vote counts';
COMMENT ON VIEW poll_options_with_totals IS 'Poll options with total votes (authenticated + external)';

