-- 316_ciceron_events_rpc_only.rollback.sql
-- Restores authenticated INSERT/UPDATE/DELETE and events_insert as of 302.

GRANT INSERT, UPDATE, DELETE ON ciceron.events TO authenticated;

DROP POLICY IF EXISTS events_insert ON ciceron.events;
CREATE POLICY events_insert ON ciceron.events
  FOR INSERT TO authenticated
  WITH CHECK (
    ((firm_id IS NULL) AND (user_id = ciceron.current_actor_id()))
    OR (
      (firm_id IN (SELECT ciceron.firms_of_current_user()))
      AND ciceron.is_ciceron_member()
    )
  );

COMMENT ON TABLE ciceron.events IS NULL;
