-- 208_fund_votes_allow_anon.sql
-- Allow anonymous cause voting via anonymous_participants (parity with
-- market_votes anon flow). Shares come in via /fund/causes/[slug]?ref=...
-- so cold-link visitors must be able to vote without signing up.
--
-- Changes:
--   1. fund_votes.user_id becomes nullable.
--   2. Add fund_votes.anonymous_participant_id (nullable FK).
--   3. CHECK exactly one voter reference is populated per row.
--   4. Replace UNIQUE(user_id, cause_id, cycle) with two partial unique
--      indexes so each voter kind dedupes independently.
--   5. RLS SELECT stays public; inserts continue to be written by the
--      API route using the admin client (which bypasses RLS), so no
--      new anon-insert policy is required.
--
-- Idempotent; safe to re-run.

BEGIN;

ALTER TABLE public.fund_votes
  ADD COLUMN IF NOT EXISTS anonymous_participant_id UUID
    REFERENCES public.anonymous_participants(id) ON DELETE CASCADE;

ALTER TABLE public.fund_votes
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop legacy UNIQUE so partial indexes can take over.
-- The constraint name follows the default Postgres pattern created by
-- the original migration (UNIQUE(user_id, cause_id, cycle)).
ALTER TABLE public.fund_votes
  DROP CONSTRAINT IF EXISTS fund_votes_user_id_cause_id_cycle_key;

-- Exactly one voter reference must be set.
ALTER TABLE public.fund_votes
  DROP CONSTRAINT IF EXISTS fund_votes_voter_chk;
ALTER TABLE public.fund_votes
  ADD CONSTRAINT fund_votes_voter_chk
  CHECK (
    ((user_id IS NOT NULL)::int + (anonymous_participant_id IS NOT NULL)::int) = 1
  );

-- Partial unique constraints — one per voter kind per cause per cycle.
CREATE UNIQUE INDEX IF NOT EXISTS fund_votes_user_cause_cycle_uq
  ON public.fund_votes(user_id, cause_id, cycle)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fund_votes_anon_cause_cycle_uq
  ON public.fund_votes(anonymous_participant_id, cause_id, cycle)
  WHERE anonymous_participant_id IS NOT NULL;

-- Helpful lookup index for conversion flows.
CREATE INDEX IF NOT EXISTS idx_fund_votes_anon_participant
  ON public.fund_votes(anonymous_participant_id)
  WHERE anonymous_participant_id IS NOT NULL;

COMMIT;
