-- Rollback 289. Destroys all locked predictions; export first if any exist:
--   copy (select * from public.pulse_ai_predictions) to stdout with csv header;
drop table if exists public.pulse_ai_predictions;  -- drops its triggers + index
drop function if exists public.pulse_ai_predictions_stamp_lock();
drop function if exists public.pulse_ai_predictions_immutable();
