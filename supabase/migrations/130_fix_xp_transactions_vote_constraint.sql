-- Fix voting error: xp_transactions_action_type_check constraint violation
-- The execute_market_vote function inserts action_type 'prediction_vote' and
-- resolve_market_free inserts 'prediction_correct', but the CHECK constraint
-- only allowed older action types (vote_cast, content_created, etc.).
--
-- Run this in Supabase SQL Editor to fix the voting error immediately.

-- Drop the restrictive constraint (any string is valid for analytics)
ALTER TABLE public.xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_action_type_check;

-- Also drop if it exists on user_xp (some setups may use that table)
ALTER TABLE public.user_xp DROP CONSTRAINT IF EXISTS xp_transactions_action_type_check;
ALTER TABLE public.user_xp DROP CONSTRAINT IF EXISTS user_xp_action_type_check;
ALTER TABLE public.user_xp DROP CONSTRAINT IF EXISTS user_xp_source_check;
