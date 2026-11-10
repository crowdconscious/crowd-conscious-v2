-- 300_ciceron_storage.sql
-- Private Storage bucket for Cicéron firm files. Paths must start with firm_id.
-- Depends on 298 + 299. Idempotent.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ciceron',
  'ciceron',
  false,
  52428800, -- 50 MiB
  ARRAY[
    'application/pdf',
    'text/plain',
    'text/html',
    'application/json',
    'image/png',
    'image/jpeg',
    'message/rfc822'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE storage.buckets IS 'Includes ciceron private bucket (firm_id-prefixed object paths).';

-- Path layout: {firm_id}/...
CREATE OR REPLACE FUNCTION ciceron.storage_firm_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

DROP POLICY IF EXISTS ciceron_storage_select ON storage.objects;
CREATE POLICY ciceron_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ciceron'
    AND ciceron.storage_firm_id(name) IN (SELECT ciceron.firms_of_current_user())
  );

DROP POLICY IF EXISTS ciceron_storage_insert ON storage.objects;
CREATE POLICY ciceron_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ciceron'
    AND ciceron.storage_firm_id(name) IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.can_manage_firm(ciceron.storage_firm_id(name))
  );

DROP POLICY IF EXISTS ciceron_storage_update ON storage.objects;
CREATE POLICY ciceron_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ciceron'
    AND ciceron.storage_firm_id(name) IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.can_manage_firm(ciceron.storage_firm_id(name))
  )
  WITH CHECK (
    bucket_id = 'ciceron'
    AND ciceron.storage_firm_id(name) IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.can_manage_firm(ciceron.storage_firm_id(name))
  );

DROP POLICY IF EXISTS ciceron_storage_delete ON storage.objects;
CREATE POLICY ciceron_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ciceron'
    AND ciceron.storage_firm_id(name) IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.can_manage_firm(ciceron.storage_firm_id(name))
  );

GRANT EXECUTE ON FUNCTION ciceron.storage_firm_id(text) TO authenticated, service_role;
