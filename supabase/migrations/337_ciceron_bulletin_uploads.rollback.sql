-- Rollback 337_ciceron_bulletin_uploads.sql

DROP FUNCTION IF EXISTS ciceron.finalize_bulletin_upload(
  uuid, uuid, uuid, text, int, int, text, uuid
);
DROP FUNCTION IF EXISTS ciceron.create_bulletin_upload(
  uuid, uuid, text, text, date, uuid, text, text, text, text, int, int, text, uuid, boolean, int, uuid
);
DROP TABLE IF EXISTS ciceron.bulletin_uploads CASCADE;
