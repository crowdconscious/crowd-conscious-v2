-- 320_ciceron_hardening_prompt9.rollback.sql
-- Restores set_actor EXECUTE to authenticated (304) and firm_onboarding FOR ALL write (314).

GRANT EXECUTE ON FUNCTION ciceron.set_actor(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION ciceron.set_actor(uuid) FROM PUBLIC, anon;

COMMENT ON FUNCTION ciceron.set_actor(uuid) IS
  'Test/harness helper: sets transaction-local actor for RLS without auth.users.';

DROP POLICY IF EXISTS firm_onboarding_insert ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_update ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_delete ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_select ON ciceron.firm_onboarding;
DROP POLICY IF EXISTS firm_onboarding_write ON ciceron.firm_onboarding;

CREATE POLICY firm_onboarding_select ON ciceron.firm_onboarding
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

CREATE POLICY firm_onboarding_write ON ciceron.firm_onboarding
  FOR ALL TO authenticated
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
