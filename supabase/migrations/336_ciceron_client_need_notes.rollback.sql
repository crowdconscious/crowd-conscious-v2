-- Rollback 336_ciceron_client_need_notes.sql

DROP FUNCTION IF EXISTS ciceron.mark_client_need_note_read(uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.submit_client_need_note(uuid, uuid, text, text, boolean, boolean);
DROP TABLE IF EXISTS ciceron.client_need_notes CASCADE;
