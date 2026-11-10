-- 303_ciceron_function_search_path.sql
-- Advisor fix: pin search_path on functions created in 298/300 (already on prod).
-- Do not edit 298–300; this migration is additive.

CREATE OR REPLACE FUNCTION ciceron.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ciceron, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ciceron.audit_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ciceron, public
AS $$
BEGIN
  RAISE EXCEPTION 'ciceron.audit_events is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION ciceron.storage_firm_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ciceron, public
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

COMMENT ON FUNCTION ciceron.set_updated_at() IS 'BEFORE UPDATE trigger: sets updated_at to now(). search_path pinned.';
COMMENT ON FUNCTION ciceron.audit_events_immutable() IS 'Blocks UPDATE/DELETE on audit_events. search_path pinned.';
COMMENT ON FUNCTION ciceron.storage_firm_id(text) IS
  'Extracts firm_id from ciceron storage object paths ({firm_id}/…). Private bucket id: ciceron. search_path pinned.';
