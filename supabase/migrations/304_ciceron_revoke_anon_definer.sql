-- 304_ciceron_revoke_anon_definer.sql
-- ALREADY APPLIED TO PRODUCTION (manual apply as ciceron_revoke_anon_definer).
-- This file exists so the repo migration history matches production.
-- Do not edit applied semantics; re-running is idempotent REVOKE/GRANT.

REVOKE EXECUTE ON FUNCTION ciceron.set_actor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION ciceron.current_actor_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION ciceron.deliveries_tier2_gate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION ciceron.deadlines_confirm_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.set_actor(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.current_actor_id() TO authenticated, service_role;
