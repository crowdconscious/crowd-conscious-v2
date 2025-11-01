-- NUCLEAR OPTION: Completely disable RLS on storage
-- Use this ONLY if the simple fix doesn't work

-- This completely removes all security on storage objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Should show rowsecurity = false

-- Optional: Re-enable later with proper policies
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
