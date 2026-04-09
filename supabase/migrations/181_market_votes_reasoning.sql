-- Optional short "why?" text on votes (Pulse / markets / guests)

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS reasoning text;

ALTER TABLE public.market_votes
  DROP CONSTRAINT IF EXISTS market_votes_reasoning_max_length;

ALTER TABLE public.market_votes
  ADD CONSTRAINT market_votes_reasoning_max_length CHECK (
    reasoning IS NULL OR char_length(reasoning) <= 200
  );

CREATE INDEX IF NOT EXISTS idx_votes_reasoning
  ON public.market_votes (market_id)
  WHERE reasoning IS NOT NULL AND reasoning <> '';

COMMENT ON COLUMN public.market_votes.reasoning IS 'Optional voter comment (max 200 chars); UI may use 100 for live micro-markets.';
