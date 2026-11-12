-- 316_ciceron_events_rpc_only.sql
-- Prompt 8 follow-up: product events are insert-only via service_role / record_product_event.
-- Additive tighten of ciceron.events grants/policies. Requires 314.
-- Agents do not apply to production.

DROP POLICY IF EXISTS events_insert ON ciceron.events;

REVOKE INSERT, UPDATE, DELETE ON ciceron.events FROM authenticated;

COMMENT ON TABLE ciceron.events IS
  'Product analytics. SELECT for firm members; INSERT/UPDATE/DELETE only via service_role or ciceron.record_product_event (Prompt 8).';
