-- Create sponsor-logos bucket for sponsor logo uploads (public read)
-- API uses service role for uploads (bypasses RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-logos',
  'sponsor-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Ensure public read
DROP POLICY IF EXISTS "Public read sponsor logos" ON storage.objects;
CREATE POLICY "Public read sponsor logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'sponsor-logos');
