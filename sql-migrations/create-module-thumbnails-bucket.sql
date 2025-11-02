-- Create storage bucket for module thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-thumbnails', 'module-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on module-thumbnails bucket
CREATE POLICY "Anyone can view module thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'module-thumbnails');

CREATE POLICY "Authenticated users can upload module thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'module-thumbnails' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own module thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'module-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own module thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'module-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

