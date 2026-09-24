-- ============================================================================
-- 262: Multi-select Pulse votes (vote_mode='multi') with per-option certainty
--
-- Product:
--   - One market_votes row per voter (UNIQUE + n-counting by people unchanged).
--   - Child table market_vote_selections holds each pick + confidence 0–10.
--   - market_votes.outcome_id + confidence = highest-certainty pick
--     (tie: first in the submitted selections array).
--   - Per option: vote_count = people who picked it; total_confidence = sum of
--     certainty; probability = share of total certainty (sums to 1).
--   - Old single-option RPC callers keep working (p_selections DEFAULT NULL).
--
-- Security (intentional — do NOT change):
--   execute_anonymous_market_vote / execute_alias_anonymous_market_vote stay
--   GRANT EXECUTE TO service_role ONLY. Mobile guests vote via
--   POST /api/votes/anonymous (web), not direct RPC with the anon key.
--
-- Owner applies this SQL after review. Do not auto-apply to live Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.prediction_markets
  DROP CONSTRAINT IF EXISTS prediction_markets_vote_mode_check;

ALTER TABLE public.prediction_markets
  ADD CONSTRAINT prediction_markets_vote_mode_check
  CHECK (vote_mode IN ('single', 'ranked', 'multi'));

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS max_selections integer NOT NULL DEFAULT 3;

ALTER TABLE public.prediction_markets
  DROP CONSTRAINT IF EXISTS prediction_markets_max_selections_check;

ALTER TABLE public.prediction_markets
  ADD CONSTRAINT prediction_markets_max_selections_check
  CHECK (max_selections >= 2 AND max_selections <= 5);

COMMENT ON COLUMN public.prediction_markets.vote_mode IS
  'single (default): one outcome. ranked: up to 3 ordered prefs; confidence on rank 1 only. multi: up to max_selections picks each with own confidence 0–10.';
COMMENT ON COLUMN public.prediction_markets.max_selections IS
  'For vote_mode=multi only: max options a voter may pick (2–5, default 3). Ignored for single/ranked.';

-- Mode + max_selections lock after the first vote (people, not picks).
CREATE OR REPLACE FUNCTION public.prevent_pulse_vote_mode_change_after_votes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       OLD.vote_mode IS DISTINCT FROM NEW.vote_mode
       OR OLD.max_selections IS DISTINCT FROM NEW.max_selections
     )
     AND EXISTS (SELECT 1 FROM public.market_votes WHERE market_id = NEW.id)
  THEN
    RAISE EXCEPTION 'vote_mode and max_selections are locked after the first vote'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_pulse_vote_mode_change ON public.prediction_markets;
CREATE TRIGGER trg_prevent_pulse_vote_mode_change
  BEFORE UPDATE OF vote_mode, max_selections ON public.prediction_markets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pulse_vote_mode_change_after_votes();

-- ---------------------------------------------------------------------------
-- Child table: one row per (vote, outcome) selection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_vote_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.market_votes(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES public.market_outcomes(id) ON DELETE CASCADE,
  confidence integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_vote_selections_confidence_check
    CHECK (confidence >= 0 AND confidence <= 10),
  CONSTRAINT market_vote_selections_vote_outcome_unique
    UNIQUE (vote_id, outcome_id)
);

CREATE INDEX IF NOT EXISTS market_vote_selections_market_id_idx
  ON public.market_vote_selections (market_id);
CREATE INDEX IF NOT EXISTS market_vote_selections_outcome_id_idx
  ON public.market_vote_selections (outcome_id);
CREATE INDEX IF NOT EXISTS market_vote_selections_vote_id_idx
  ON public.market_vote_selections (vote_id);

COMMENT ON TABLE public.market_vote_selections IS
  'Per-option picks for a market_votes row. Single/ranked stores one row (primary). Multi stores 1..max_selections. confidence 0 = No lo sé (zero weight).';

ALTER TABLE public.market_vote_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_vote_selections_select_public ON public.market_vote_selections;
-- Selections are analytics; public Pulse surface uses aggregates. Authenticated
-- can read own vote's selections via vote join in app code; service_role bypasses RLS.
CREATE POLICY market_vote_selections_select_own ON public.market_vote_selections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.market_votes mv
      WHERE mv.id = vote_id AND mv.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.market_vote_selections TO authenticated, anon, service_role;
GRANT ALL ON public.market_vote_selections TO service_role;

-- Backfill: every existing vote becomes one selection (idempotent).
INSERT INTO public.market_vote_selections (vote_id, market_id, outcome_id, confidence, created_at)
SELECT mv.id, mv.market_id, mv.outcome_id, mv.confidence, COALESCE(mv.created_at, now())
FROM public.market_votes mv
WHERE NOT EXISTS (
  SELECT 1 FROM public.market_vote_selections s WHERE s.vote_id = mv.id
)
ON CONFLICT (vote_id, outcome_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Shared: renormalize probabilities from total_confidence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renormalize_market_outcome_probabilities(p_market_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_weight numeric;
  v_outcome_rec RECORD;
  v_market_type text;
BEGIN
  SELECT SUM(total_confidence) INTO v_total_weight
  FROM public.market_outcomes WHERE market_id = p_market_id;

  IF v_total_weight IS NOT NULL AND v_total_weight > 0 THEN
    FOR v_outcome_rec IN
      SELECT id, total_confidence FROM public.market_outcomes WHERE market_id = p_market_id
    LOOP
      UPDATE public.market_outcomes
      SET probability = v_outcome_rec.total_confidence::numeric / v_total_weight
      WHERE id = v_outcome_rec.id;
    END LOOP;
  END IF;

  SELECT COALESCE(market_type, 'binary') INTO v_market_type
  FROM public.prediction_markets WHERE id = p_market_id;

  IF v_market_type = 'binary' THEN
    UPDATE public.prediction_markets
    SET current_probability = COALESCE((
      SELECT probability * 100 FROM public.market_outcomes
      WHERE market_id = p_market_id AND LOWER(label) IN ('yes', 'sí', 'si')
      LIMIT 1
    ), 50),
    updated_at = now()
    WHERE id = p_market_id;
  ELSE
    UPDATE public.prediction_markets
    SET current_probability = COALESCE((
      SELECT MAX(probability) * 100 FROM public.market_outcomes WHERE market_id = p_market_id
    ), 50),
    updated_at = now()
    WHERE id = p_market_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.renormalize_market_outcome_probabilities(uuid) FROM PUBLIC;

-- Reverse aggregate contribution of current selections for a vote, then delete them.
CREATE OR REPLACE FUNCTION public.clear_vote_selections_and_aggregates(p_vote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_w integer;
BEGIN
  FOR r IN
    SELECT outcome_id, confidence
    FROM public.market_vote_selections
    WHERE vote_id = p_vote_id
  LOOP
    v_w := CASE WHEN r.confidence >= 1 THEN r.confidence ELSE 0 END;
    UPDATE public.market_outcomes
    SET vote_count = GREATEST(0, vote_count - 1),
        total_confidence = GREATEST(0, total_confidence - v_w)
    WHERE id = r.outcome_id;
  END LOOP;

  DELETE FROM public.market_vote_selections WHERE vote_id = p_vote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_vote_selections_and_aggregates(uuid) FROM PUBLIC;

-- Insert selections and bump aggregates. p_selections = [{outcome_id, confidence}]
CREATE OR REPLACE FUNCTION public.insert_vote_selections_and_aggregates(
  p_vote_id uuid,
  p_market_id uuid,
  p_selections jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elem jsonb;
  v_oid uuid;
  v_conf integer;
  v_w integer;
  v_i int;
  v_n int;
BEGIN
  IF p_selections IS NULL OR jsonb_typeof(p_selections) <> 'array' THEN
    RAISE EXCEPTION 'selections required';
  END IF;
  v_n := jsonb_array_length(p_selections);
  FOR v_i IN 0 .. v_n - 1 LOOP
    v_elem := p_selections -> v_i;
    v_oid := (v_elem->>'outcome_id')::uuid;
    v_conf := (v_elem->>'confidence')::int;
    v_w := CASE WHEN v_conf >= 1 THEN v_conf ELSE 0 END;

    INSERT INTO public.market_vote_selections (vote_id, market_id, outcome_id, confidence)
    VALUES (p_vote_id, p_market_id, v_oid, v_conf);

    UPDATE public.market_outcomes
    SET vote_count = vote_count + 1,
        total_confidence = total_confidence + v_w
    WHERE id = v_oid;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_vote_selections_and_aggregates(uuid, uuid, jsonb) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- prepare_market_vote_payload — add optional p_selections
-- Returns: ok, rankings, other_text, selections, primary_outcome_id, primary_confidence
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.prepare_market_vote_payload(uuid, uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.prepare_market_vote_payload(
  p_market_id uuid,
  p_outcome_id uuid,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_max_sel int;
  v_rankings jsonb;
  v_other text;
  v_elem jsonb;
  v_rank int;
  v_oid uuid;
  v_conf int;
  v_seen_ranks int[] := ARRAY[]::int[];
  v_seen_oids uuid[] := ARRAY[]::uuid[];
  v_n int;
  v_i int;
  v_rank1 uuid;
  v_has_other boolean := false;
  v_selected uuid[];
  v_selections jsonb := '[]'::jsonb;
  v_primary_oid uuid;
  v_primary_conf int;
  v_best_conf int := -1;
BEGIN
  SELECT COALESCE(vote_mode, 'single'), COALESCE(max_selections, 3)
  INTO v_mode, v_max_sel
  FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Market not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_outcomes
    WHERE id = p_outcome_id AND market_id = p_market_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid outcome for this market');
  END IF;

  -- -------- multi mode --------
  IF v_mode = 'multi' THEN
    IF p_rankings IS NOT NULL
       AND jsonb_typeof(p_rankings) = 'array'
       AND jsonb_array_length(p_rankings) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ranked submit on a multi-select Pulse');
    END IF;
    v_rankings := NULL;

    -- Legacy: no selections → single pick from p_outcome_id + caller confidence
    -- (confidence is validated in execute_*; here we only shape outcomes).
    -- Callers that omit selections must still pass p_outcome_id; confidence is
    -- attached in execute_* when building the final selections list.
    IF p_selections IS NULL
       OR jsonb_typeof(p_selections) <> 'array'
       OR jsonb_array_length(p_selections) = 0 THEN
      -- Placeholder; execute_* rewrites with real confidence.
      v_selections := jsonb_build_array(
        jsonb_build_object('outcome_id', p_outcome_id, 'confidence', NULL)
      );
      v_selected := ARRAY[p_outcome_id];
      v_primary_oid := p_outcome_id;
      v_primary_conf := NULL;
    ELSE
      v_n := jsonb_array_length(p_selections);
      IF v_n < 1 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'At least one selection required');
      END IF;
      IF v_n > v_max_sel THEN
        RETURN jsonb_build_object('ok', false, 'error', format('At most %s selections', v_max_sel));
      END IF;

      FOR v_i IN 0 .. v_n - 1 LOOP
        v_elem := p_selections -> v_i;
        BEGIN
          v_oid := (v_elem->>'outcome_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid selection outcome');
        END;
        BEGIN
          v_conf := (v_elem->>'confidence')::int;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid selection confidence');
        END;
        IF v_conf < 0 OR v_conf > 10 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Confidence must be 0-10');
        END IF;
        IF v_oid = ANY (v_seen_oids) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Duplicate selection outcome');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM public.market_outcomes
          WHERE id = v_oid AND market_id = p_market_id
        ) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid selection outcome');
        END IF;
        v_seen_oids := v_seen_oids || v_oid;
        v_selections := v_selections || jsonb_build_array(
          jsonb_build_object('outcome_id', v_oid, 'confidence', v_conf)
        );
        -- Primary = highest certainty; tie → first chosen (array order).
        IF v_conf > v_best_conf THEN
          v_best_conf := v_conf;
          v_primary_oid := v_oid;
          v_primary_conf := v_conf;
        END IF;
      END LOOP;

      v_selected := v_seen_oids;

      -- Caller's p_outcome_id must match derived primary when selections provided.
      IF p_outcome_id IS DISTINCT FROM v_primary_oid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Primary outcome must be highest-certainty pick');
      END IF;
    END IF;

  -- -------- single mode --------
  ELSIF v_mode = 'single' THEN
    IF p_rankings IS NOT NULL
       AND jsonb_typeof(p_rankings) = 'array'
       AND jsonb_array_length(p_rankings) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ranked submit on a single-choice Pulse');
    END IF;
    IF p_selections IS NOT NULL
       AND jsonb_typeof(p_selections) = 'array'
       AND jsonb_array_length(p_selections) > 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Multi-select submit on a single-choice Pulse');
    END IF;
    -- Optional single-element selections must match p_outcome_id.
    IF p_selections IS NOT NULL
       AND jsonb_typeof(p_selections) = 'array'
       AND jsonb_array_length(p_selections) = 1 THEN
      BEGIN
        v_oid := (p_selections->0->>'outcome_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Invalid selection outcome');
      END;
      IF v_oid IS DISTINCT FROM p_outcome_id THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Selection must match primary outcome');
      END IF;
    END IF;
    v_rankings := NULL;
    v_selected := ARRAY[p_outcome_id];
    v_primary_oid := p_outcome_id;
    v_primary_conf := NULL; -- filled by execute_* from p_confidence
    v_selections := jsonb_build_array(
      jsonb_build_object('outcome_id', p_outcome_id, 'confidence', NULL)
    );

  -- -------- ranked mode (unchanged spirit) --------
  ELSE
    IF p_selections IS NOT NULL
       AND jsonb_typeof(p_selections) = 'array'
       AND jsonb_array_length(p_selections) > 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Multi-select submit on a ranked Pulse');
    END IF;

    IF p_rankings IS NULL
       OR jsonb_typeof(p_rankings) <> 'array'
       OR jsonb_array_length(p_rankings) = 0 THEN
      v_rankings := jsonb_build_array(
        jsonb_build_object('outcome_id', p_outcome_id, 'rank', 1)
      );
      v_selected := ARRAY[p_outcome_id];
    ELSE
      v_n := jsonb_array_length(p_rankings);
      IF v_n > 3 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'At most 3 ranked options');
      END IF;

      FOR v_i IN 0 .. v_n - 1 LOOP
        v_elem := p_rankings -> v_i;
        BEGIN
          v_oid := (v_elem->>'outcome_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid ranked outcome');
        END;
        BEGIN
          v_rank := (v_elem->>'rank')::int;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid rank');
        END;
        IF v_rank < 1 OR v_rank > 3 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Rank must be 1, 2, or 3');
        END IF;
        IF v_rank = ANY (v_seen_ranks) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Duplicate rank');
        END IF;
        IF v_oid = ANY (v_seen_oids) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Duplicate ranked outcome');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM public.market_outcomes
          WHERE id = v_oid AND market_id = p_market_id
        ) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid ranked outcome');
        END IF;
        v_seen_ranks := v_seen_ranks || v_rank;
        v_seen_oids := v_seen_oids || v_oid;
      END LOOP;

      FOR v_i IN 1 .. v_n LOOP
        IF NOT (v_i = ANY (v_seen_ranks)) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Ranks must be consecutive from 1');
        END IF;
      END LOOP;

      SELECT (e->>'outcome_id')::uuid INTO v_rank1
      FROM jsonb_array_elements(p_rankings) e
      WHERE (e->>'rank')::int = 1;
      IF v_rank1 IS DISTINCT FROM p_outcome_id THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Primary outcome must be rank 1');
      END IF;

      SELECT jsonb_agg(
               jsonb_build_object('outcome_id', oid, 'rank', rnk)
               ORDER BY rnk
             )
      INTO v_rankings
      FROM (
        SELECT (e->>'outcome_id')::uuid AS oid, (e->>'rank')::int AS rnk
        FROM jsonb_array_elements(p_rankings) e
      ) s;

      SELECT array_agg(oid) INTO v_selected
      FROM (
        SELECT (e->>'outcome_id')::uuid AS oid
        FROM jsonb_array_elements(v_rankings) e
      ) x;
    END IF;

    v_primary_oid := p_outcome_id;
    v_primary_conf := NULL;
    -- Ranked still stores one selection row for rank-1 confidence weight.
    v_selections := jsonb_build_array(
      jsonb_build_object('outcome_id', p_outcome_id, 'confidence', NULL)
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.market_outcomes
    WHERE id = ANY (v_selected) AND COALESCE(is_other, false) = true
  ) INTO v_has_other;

  IF v_has_other THEN
    v_other := btrim(COALESCE(p_other_text, ''));
    IF v_other = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Other text is required');
    END IF;
    IF char_length(v_other) > 120 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Other text must be 120 characters or fewer');
    END IF;
  ELSE
    v_other := NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rankings', v_rankings,
    'other_text', v_other,
    'selections', v_selections,
    'primary_outcome_id', v_primary_oid,
    'primary_confidence', v_primary_conf
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_market_vote_payload(uuid, uuid, jsonb, text, jsonb) FROM PUBLIC;

-- Fill NULL confidence placeholders in prepared selections with p_confidence.
CREATE OR REPLACE FUNCTION public.finalize_vote_selections(
  p_prepared_selections jsonb,
  p_confidence integer
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_i int;
  v_n int;
  v_conf int;
BEGIN
  IF p_prepared_selections IS NULL OR jsonb_typeof(p_prepared_selections) <> 'array' THEN
    RETURN jsonb_build_array(
      jsonb_build_object('outcome_id', null, 'confidence', p_confidence)
    );
  END IF;
  v_n := jsonb_array_length(p_prepared_selections);
  FOR v_i IN 0 .. v_n - 1 LOOP
    v_elem := p_prepared_selections -> v_i;
    IF v_elem->>'confidence' IS NULL OR v_elem->>'confidence' = '' THEN
      v_conf := p_confidence;
    ELSE
      v_conf := (v_elem->>'confidence')::int;
    END IF;
    v_out := v_out || jsonb_build_array(
      jsonb_build_object(
        'outcome_id', (v_elem->>'outcome_id')::uuid,
        'confidence', v_conf
      )
    );
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_vote_selections(jsonb, integer) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Drop old 6-arg vote RPCs; recreate with optional p_selections (7th arg).
-- Defaults keep 4-arg / 6-arg PostgREST callers working when args are named
-- or trailing defaults omitted — but DROP avoids overload ambiguity.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.execute_market_vote(uuid, uuid, uuid, integer, jsonb, text);
DROP FUNCTION IF EXISTS public.execute_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text);
DROP FUNCTION IF EXISTS public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text);

CREATE OR REPLACE FUNCTION public.execute_market_vote(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_existing public.market_votes%ROWTYPE;
  v_xp integer := 0;
  v_vote_id uuid;
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
  v_selections jsonb;
  v_primary_oid uuid;
  v_primary_conf integer;
  v_old_sel jsonb;
  v_mode text;
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;
  IF v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
  END IF;

  v_mode := COALESCE(v_market.vote_mode, 'single');

  -- When selections provided with confidences, top-level p_confidence must match
  -- the derived primary; when omitted, use p_confidence for the single/legacy path.
  IF p_confidence < 0 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 0-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(
    p_market_id, p_outcome_id, p_rankings, p_other_text, p_selections
  );
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;

  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');
  v_primary_oid := (v_prepared->>'primary_outcome_id')::uuid;

  IF v_mode = 'multi'
     AND p_selections IS NOT NULL
     AND jsonb_typeof(p_selections) = 'array'
     AND jsonb_array_length(p_selections) > 0 THEN
    v_selections := v_prepared->'selections';
    v_primary_conf := (v_prepared->>'primary_confidence')::int;
    -- Align top-level confidence with primary when client sent full selections.
    IF p_confidence IS DISTINCT FROM v_primary_conf THEN
      -- Allow client to send matching values; if mismatch, prefer derived primary.
      -- Require they match for honesty of old single-field consumers.
      RETURN jsonb_build_object('success', false, 'error', 'Confidence must match highest-certainty pick');
    END IF;
  ELSE
    v_selections := public.finalize_vote_selections(v_prepared->'selections', p_confidence);
    v_primary_conf := p_confidence;
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = v_primary_oid AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_user_id;

  IF FOUND THEN
    IF COALESCE(v_existing.is_anonymous, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Anonymous votes cannot be updated');
    END IF;

    SELECT COALESCE(jsonb_agg(
             jsonb_build_object('outcome_id', outcome_id, 'confidence', confidence)
             ORDER BY created_at
           ), '[]'::jsonb)
    INTO v_old_sel
    FROM public.market_vote_selections
    WHERE vote_id = v_existing.id;

    IF v_existing.outcome_id = v_primary_oid
       AND v_existing.confidence = v_primary_conf
       AND v_existing.rankings IS NOT DISTINCT FROM v_rankings_col
       AND v_existing.other_text IS NOT DISTINCT FROM v_other_col
       AND v_old_sel = v_selections THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_update', true,
        'no_change', true,
        'xp_earned', 0,
        'outcome_label', v_outcome.label,
        'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
        'confidence', v_primary_conf
      );
    END IF;

    PERFORM public.clear_vote_selections_and_aggregates(v_existing.id);

    UPDATE public.market_votes
    SET outcome_id = v_primary_oid,
        confidence = v_primary_conf,
        rankings = v_rankings_col,
        other_text = v_other_col,
        change_count = COALESCE(change_count, 0) + 1,
        updated_at = now()
    WHERE id = v_existing.id;

    PERFORM public.insert_vote_selections_and_aggregates(
      v_existing.id, p_market_id, v_selections
    );
    PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

    INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
    VALUES (
      p_market_id,
      (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
      0,
      (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id)
    );

    RETURN jsonb_build_object(
      'success', true,
      'is_update', true,
      'xp_earned', 0,
      'vote_id', v_existing.id,
      'outcome_label', v_outcome.label,
      'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
      'confidence', v_primary_conf
    );
  END IF;

  v_xp := 0;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous, rankings, other_text
  )
  VALUES (
    p_market_id, v_primary_oid, p_user_id, v_primary_conf, v_xp, false, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.insert_vote_selections_and_aggregates(v_vote_id, p_market_id, v_selections);

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'is_update', false,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
    'confidence', v_primary_conf
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.execute_market_vote IS
  'Cast/update a vote. Supports single, ranked, multi (p_selections). confidence 0 = No lo sé. No XP for casting.';

CREATE OR REPLACE FUNCTION public.execute_anonymous_market_vote(
  p_guest_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_existing public.market_votes%ROWTYPE;
  v_vote_id uuid;
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
  v_selections jsonb;
  v_primary_oid uuid;
  v_primary_conf integer;
  v_mode text;
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;
  IF v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
  END IF;

  v_mode := COALESCE(v_market.vote_mode, 'single');

  IF p_confidence < 0 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 0-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(
    p_market_id, p_outcome_id, p_rankings, p_other_text, p_selections
  );
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;

  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');
  v_primary_oid := (v_prepared->>'primary_outcome_id')::uuid;

  IF v_mode = 'multi'
     AND p_selections IS NOT NULL
     AND jsonb_typeof(p_selections) = 'array'
     AND jsonb_array_length(p_selections) > 0 THEN
    v_selections := v_prepared->'selections';
    v_primary_conf := (v_prepared->>'primary_confidence')::int;
    IF p_confidence IS DISTINCT FROM v_primary_conf THEN
      RETURN jsonb_build_object('success', false, 'error', 'Confidence must match highest-certainty pick');
    END IF;
  ELSE
    v_selections := public.finalize_vote_selections(v_prepared->'selections', p_confidence);
    v_primary_conf := p_confidence;
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = v_primary_oid AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_guest_id AND COALESCE(is_anonymous, false) = true;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_voted', true,
      'error', 'already_voted'
    );
  END IF;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous, rankings, other_text
  )
  VALUES (
    p_market_id, v_primary_oid, p_guest_id, v_primary_conf, 0, true, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.insert_vote_selections_and_aggregates(v_vote_id, p_market_id, v_selections);

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', 0,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
    'confidence', v_primary_conf,
    'is_anonymous', true
  );
END;
$$;

-- Keep service_role only — mobile uses POST /api/votes/anonymous.
GRANT EXECUTE ON FUNCTION public.execute_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.execute_anonymous_market_vote IS
  'Guest vote (service_role). Multi via p_selections. confidence 0 = No lo sé. No XP.';

CREATE OR REPLACE FUNCTION public.execute_alias_anonymous_market_vote(
  p_participant_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_existing public.market_votes%ROWTYPE;
  v_participant public.anonymous_participants%ROWTYPE;
  v_vote_id uuid;
  v_xp integer := 0;
  v_session text;
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
  v_selections jsonb;
  v_primary_oid uuid;
  v_primary_conf integer;
  v_mode text;
BEGIN
  SELECT * INTO v_participant FROM public.anonymous_participants
  WHERE id = p_participant_id AND converted_to_user_id IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid anonymous participant');
  END IF;
  v_session := v_participant.session_id;

  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;
  IF v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
  END IF;

  IF v_market.live_event_id IS NULL
     AND COALESCE(v_market.is_micro_market, false) = false
     AND COALESCE(v_market.is_pulse, false) = false
     AND NOT EXISTS (
       SELECT 1 FROM public.conscious_locations
       WHERE current_market_id = p_market_id
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in to vote on this market');
  END IF;

  v_mode := COALESCE(v_market.vote_mode, 'single');

  IF p_confidence < 0 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 0-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(
    p_market_id, p_outcome_id, p_rankings, p_other_text, p_selections
  );
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;

  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');
  v_primary_oid := (v_prepared->>'primary_outcome_id')::uuid;

  IF v_mode = 'multi'
     AND p_selections IS NOT NULL
     AND jsonb_typeof(p_selections) = 'array'
     AND jsonb_array_length(p_selections) > 0 THEN
    v_selections := v_prepared->'selections';
    v_primary_conf := (v_prepared->>'primary_confidence')::int;
    IF p_confidence IS DISTINCT FROM v_primary_conf THEN
      RETURN jsonb_build_object('success', false, 'error', 'Confidence must match highest-certainty pick');
    END IF;
  ELSE
    v_selections := public.finalize_vote_selections(v_prepared->'selections', p_confidence);
    v_primary_conf := p_confidence;
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = v_primary_oid AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND anonymous_participant_id = p_participant_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_voted', true,
      'error', 'already_voted'
    );
  END IF;

  v_xp := 0;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous,
    anonymous_participant_id, session_id, rankings, other_text
  )
  VALUES (
    p_market_id, v_primary_oid, NULL, v_primary_conf, v_xp, true,
    p_participant_id, v_session, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.insert_vote_selections_and_aggregates(v_vote_id, p_market_id, v_selections);

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'is_anonymous', true,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
    'confidence', v_primary_conf
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.execute_alias_anonymous_market_vote IS
  'Alias anonymous vote (service_role). Multi via p_selections. confidence 0 = No lo sé. No XP.';
