-- Rollback 327_ciceron_boletines.sql
-- Drops bulletin RPCs and tables. Safe only if no production client data depends on them.

DROP FUNCTION IF EXISTS ciceron.purge_bulletin_entry_excerpts(date, int);
DROP FUNCTION IF EXISTS ciceron.complete_bulletin_manual_check(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS ciceron.assign_bulletin_manual_check(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.ensure_bulletin_manual_check(uuid, uuid, date, text, uuid, boolean);
DROP FUNCTION IF EXISTS ciceron.record_bulletin_hit(
  uuid, uuid, uuid, date, text, numeric, text, text, text, text, text, text, text, uuid, uuid, uuid, int, boolean
);
DROP FUNCTION IF EXISTS ciceron.record_bulletin_run(
  uuid, uuid, date, text, text, text, text, int, int, int, int, int, text, text, boolean, jsonb, timestamptz, uuid
);

DROP TABLE IF EXISTS ciceron.bulletin_hits CASCADE;
DROP TABLE IF EXISTS ciceron.bulletin_entries CASCADE;
DROP TABLE IF EXISTS ciceron.bulletin_manual_checks CASCADE;
DROP TABLE IF EXISTS ciceron.bulletin_runs CASCADE;
DROP TABLE IF EXISTS ciceron.bulletin_matter_catalogue CASCADE;
DROP TABLE IF EXISTS ciceron.bulletin_sources CASCADE;
