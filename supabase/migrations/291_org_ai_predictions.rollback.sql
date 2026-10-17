-- Rollback 291_org_ai_predictions. Drops ONLY what 291 created (stored predictions are lost).
drop table if exists public.org_ai_predictions cascade;
drop function if exists public.org_ai_predictions_stamp_lock();
drop function if exists public.org_ai_predictions_immutable();
