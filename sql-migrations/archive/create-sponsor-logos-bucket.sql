-- Create sponsor-logos storage bucket
-- Run this in Supabase SQL Editor

-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsor-logos', 'sponsor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for sponsor-logos bucket
-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload their own sponsor logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sponsor-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all sponsor logos
CREATE POLICY "Public read access to sponsor logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sponsor-logos');

-- Allow users to update their own logos
CREATE POLICY "Users can update their own sponsor logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sponsor-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete their own sponsor logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sponsor-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'sponsor-logos';
