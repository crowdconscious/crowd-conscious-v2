-- 278: Every Pulse (is_pulse=true) is multi-select (owner rule 2026-10-04).
-- Additive + idempotent. Coerces vote_mode null/single -> multi and max_selections null -> 3
-- on INSERT of a Pulse, and on UPDATE that turns a market into a Pulse (create_multi_market
-- inserts first, then the app sets is_pulse=true) as long as it has no votes yet.
-- Does not rewrite existing rows. Non-Pulse markets keep the 'single' column default.
CREATE OR REPLACE FUNCTION public.enforce_pulse_always_multi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_pulse, false) THEN
    IF TG_OP = 'UPDATE' THEN
      IF COALESCE(OLD.is_pulse, false) OR EXISTS (SELECT 1 FROM public.market_votes WHERE market_id = NEW.id) THEN
        RETURN NEW;
      END IF;
    END IF;
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

REVOKE ALL ON FUNCTION public.enforce_pulse_always_multi() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_pulses_always_multi ON public.prediction_markets;
CREATE TRIGGER trg_pulses_always_multi
  BEFORE INSERT OR UPDATE OF is_pulse ON public.prediction_markets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pulse_always_multi();

COMMENT ON FUNCTION public.enforce_pulse_always_multi() IS
  'Migration 278: Pulses are always multi-select (vote_mode multi, max_selections 3).'
