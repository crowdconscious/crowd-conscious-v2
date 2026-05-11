-- Dedicated bucket for inline blog body images.
--
-- We separate from `sponsor-logos` (used for thumbnails / sponsor branding,
-- capped at 2MB) because body images are routinely 3–5MB photos and we want
-- a clear admin-only write surface. Public read so <img src> works directly.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Public read so the rendered blog can load images without signed URLs.
DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
CREATE POLICY "Public read blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

-- Writes go through the API route (service-role client + admin auth check)
-- so we don't need a per-row write policy — the service role bypasses RLS.
