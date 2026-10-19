-- Rollback for 290_lugar_consciente. Destroys pledges and awards recorded since it was applied.
BEGIN;
DROP VIEW IF EXISTS public.lugar_consciente_progress;
DROP TABLE IF EXISTS public.seal_award_events;
DROP TABLE IF EXISTS public.seal_awards;
DROP TABLE IF EXISTS public.values_pledges;
DROP INDEX IF EXISTS public.market_votes_src_created_idx;
DROP INDEX IF EXISTS public.conscious_locations_org_id_idx;
DROP INDEX IF EXISTS public.conscious_locations_src_slug_uq;
ALTER TABLE public.conscious_locations DROP CONSTRAINT IF EXISTS conscious_locations_src_slug_fmt;
ALTER TABLE public.conscious_locations DROP COLUMN IF EXISTS org_id;
ALTER TABLE public.conscious_locations DROP COLUMN IF EXISTS src_slug;
COMMIT;
