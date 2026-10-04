-- ============================================================================
-- 278: Every Pulse (is_pulse=true) is multi-select
--
-- Product (owner, 2026-10-04): Crowd Conscious Pulses always use
-- vote_mode='multi' with max_selections default 3. Single-choice is no
-- longer allowed for new Pulses. Non-Pulse prediction markets and fund
-- votes are out of scope (column default remains 'single').
--
-- Closed/resolved Pulses and stored votes stay untouched. This trigger
-- only runs BEFORE INSERT; it does not rewrite existing rows.
--
-- Owner applies this SQL after review. Do not auto-apply to live Supabase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_pulse_always_multi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_pulse, false) = true THEN
    IF NEW.vote_mode IS NULL OR NEW.vote_mode = 'single' THEN
      NEW.vote_mode := 'multi';
    END IF;
    IF NEW.max_selections IS NULL THEN
      NEW.max_selections := 3;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulses_always_multi ON public.prediction_markets;
CREATE TRIGGER trg_pulses_always_multi
  BEFORE INSERT ON public.prediction_markets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pulse_always_multi();

COMMENT ON FUNCTION public.enforce_pulse_always_multi() IS
  'BEFORE INSERT: when is_pulse=true, coerce vote_mode null/single → multi and max_selections null → 3. Migration 278.';

-- ---------------------------------------------------------------------------
-- ROLLBACK (do not run with the forward migration)
-- ---------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_pulses_always_multi ON public.prediction_markets;
-- DROP FUNCTION IF EXISTS public.enforce_pulse_always_multi();
--
-- VERIFICATION
-- ---------------------------------------------------------------------------
-- -- Trigger present:
-- SELECT tgname, tgenabled
-- FROM pg_trigger
-- WHERE tgname = 'trg_pulses_always_multi';
--
-- -- Dry-run coercion (rollback the test row):
-- BEGIN;
-- INSERT INTO public.prediction_markets (
--   title, description, category, created_by, resolution_date,
--   resolution_criteria, market_type, status, is_pulse, vote_mode
-- ) VALUES (
--   '__278_test_pulse__', 'test', 'community',
--   (SELECT id FROM auth.users LIMIT 1),
--   now() + interval '7 days',
--   'test', 'multi', 'active', true, 'single'
-- )
-- RETURNING id, is_pulse, vote_mode, max_selections;
-- -- Expect: vote_mode='multi', max_selections=3
-- ROLLBACK;
