-- Allow Conscious Inbox submissions for Conscious Locations nominations
ALTER TABLE public.conscious_inbox DROP CONSTRAINT IF EXISTS conscious_inbox_type_check;
ALTER TABLE public.conscious_inbox
  ADD CONSTRAINT conscious_inbox_type_check
  CHECK (type IN ('market_idea', 'cause_proposal', 'ngo_suggestion', 'general', 'location_nomination'));
