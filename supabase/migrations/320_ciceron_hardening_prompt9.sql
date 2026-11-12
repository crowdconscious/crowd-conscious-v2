-- 320_ciceron_hardening_prompt9.sql
-- Prompt 9 HARDENING (approve separately):
-- 1) Revoke EXECUTE on ciceron.set_actor from authenticated (and anon/public).
--    App only calls set_actor inside service_role SECURITY DEFINER RPCs.
--    Verified callers: confirm_deadline, approve_client_notify, discard_deadline,
--    decide_review, save_review_edit, reassign_review, create_delivery,
--    search_chunks_as_actor, evaluate_access, reset_demo_firm, switch_demo_persona
--    (all service_role). No app/TS client invokes set_actor directly.
-- 2) Fix advisor multiple_permissive_policies on ciceron.firm_onboarding:
--    split FOR ALL firm_onboarding_write into INSERT/UPDATE/DELETE so SELECT
--    has a single policy (firm_onboarding_select).
-- Requires 302/304 (set_actor) and 314 (firm_onboarding). Agents do not apply.

-- ---------------------------------------------------------------------------
-- 1) set_actor: service_role only
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION ciceron.set_actor(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.set_actor(uuid) TO service_role;

COMMENT ON FUNCTION ciceron.set_actor(uuid) IS
  'Harness / SECURITY DEFINER RPC helper only. EXECUTE revoked from authenticated (Prompt 9 hardening).';

-- ---------------------------------------------------------------------------
-- 2) firm_onboarding: single SELECT policy; split writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS firm_onboarding_write ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_insert ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_update ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_delete ON ciceron.firm_onboarding;

-- Keep existing SELECT as the only SELECT policy
DROP POLICY IF EXISTS firm_onboarding_select ON ciceron.firm_onboarding;
CREATE POLICY firm_onboarding_select ON ciceron.firm_onboarding
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

CREATE POLICY firm_onboarding_insert ON ciceron.firm_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );

CREATE POLICY firm_onboarding_update ON ciceron.firm_onboarding
  FOR UPDATE TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  )
  WITH CHECK (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );

CREATE POLICY firm_onboarding_delete ON ciceron.firm_onboarding
  FOR DELETE TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );
