-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database). The identical file ships in both
-- repos (web: 226_set_vote_reasoning.sql) so the codebases stay in sync.
-- =============================================================================
-- set_vote_reasoning — lets an authenticated user write/clear the optional
-- "short why" on their OWN market_votes row.
--
-- Why an RPC instead of an UPDATE RLS policy: Postgres RLS cannot restrict
-- WHICH columns an UPDATE touches, so a row-level UPDATE policy on market_votes
-- would also let clients tamper with outcome_id/confidence and corrupt the
-- aggregates maintained by execute_market_vote. This SECURITY DEFINER function
-- only mutates `reasoning`, only on the caller's own non-anonymous row, clamped
-- to 200 chars (matches market_votes.reasoning CHECK, migration 181).
--
-- Backward-compatible: the web keeps writing reasoning via the service role
-- after execute_market_vote; this is purely additive.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_vote_reasoning(
  p_market_id uuid,
  p_reasoning text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reasoning text := NULLIF(btrim(left(coalesce(p_reasoning, ''), 200)), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING errcode = '42501';
  END IF;

  UPDATE public.market_votes
     SET reasoning = v_reasoning
   WHERE market_id = p_market_id
     AND user_id = v_uid
     AND COALESCE(is_anonymous, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public.set_vote_reasoning(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_vote_reasoning(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.set_vote_reasoning(uuid, text) IS
  'Auth user writes/clears reasoning on their own non-anonymous market_votes row (<=200 chars). SECURITY DEFINER; avoids a column-unsafe UPDATE RLS policy.';
