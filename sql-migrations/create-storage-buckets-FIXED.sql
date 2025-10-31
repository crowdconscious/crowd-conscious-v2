-- Create Supabase Storage Buckets for Evidence Images
-- FIXED VERSION - Works around permission issues
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Create the bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-evidence',
  'employee-evidence',
  true, -- Public access for easy display
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================
-- STEP 2: Verify bucket creation
-- ============================================
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'employee-evidence';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see the bucket listed above, Step 1 is complete! ✅
-- 
-- Now complete Step 2 manually in the Supabase Dashboard:
-- 
-- 1. Go to: Storage → Policies
-- 2. Click on "employee-evidence" bucket
-- 3. Click "New Policy" and add these policies:
-- 
-- POLICY 1: "Public Read Access"
--   - Operation: SELECT
--   - Policy definition: true
--   - Description: Anyone can view evidence images
-- 
-- POLICY 2: "Authenticated Users Can Upload"
--   - Operation: INSERT
--   - Policy definition: (bucket_id = 'employee-evidence')
--   - Description: Authenticated users can upload evidence
-- 
-- POLICY 3: "Users Can Update Own Files"
--   - Operation: UPDATE
--   - Policy definition: (bucket_id = 'employee-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
--   - Description: Users can update their own files
-- 
-- POLICY 4: "Users Can Delete Own Files"
--   - Operation: DELETE
--   - Policy definition: (bucket_id = 'employee-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
--   - Description: Users can delete their own files
-- 
-- OR use this simpler approach for testing:
-- Just enable "Public access" for the bucket in the dashboard and skip RLS for now.
-- RLS can be added later if needed.
-- 
-- ============================================

-- Alternative: If you want to try RLS policies via SQL (requires superuser)
-- Only run this if the above manual method doesn't work

-- DROP existing policies if they exist (to avoid conflicts)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public evidence images are viewable by everyone" ON storage.objects;
  DROP POLICY IF EXISTS "Employees can upload evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Employees can update their own evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Employees can delete their own evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Corporate admins can view all company evidence" ON storage.objects;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot drop policies - insufficient privileges. Use Supabase Dashboard instead.';
END $$;

-- Note: If you got an error above, that's OK! 
-- Just use the Supabase Dashboard method described above.

