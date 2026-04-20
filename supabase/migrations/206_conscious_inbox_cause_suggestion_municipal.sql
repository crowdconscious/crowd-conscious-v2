-- 206: Allow Conscious Inbox submissions for municipal cause suggestions.
--
-- Municipalities + sponsor accounts can now nominate a local nonprofit to
-- receive a cycle of the Conscious Fund. We deliberately route these
-- through conscious_inbox instead of granting write access to
-- fund_causes: every nomination gets an editorial review + verification
-- pass before the promoted row becomes visible to the public.
--
-- This migration is additive only — existing inbox rows, policies, and
-- RLS remain untouched.
ALTER TABLE public.conscious_inbox DROP CONSTRAINT IF EXISTS conscious_inbox_type_check;
ALTER TABLE public.conscious_inbox
  ADD CONSTRAINT conscious_inbox_type_check
  CHECK (type IN (
    'market_idea',
    'cause_proposal',
    'ngo_suggestion',
    'general',
    'location_nomination',
    'cause_suggestion_municipal'
  ));
