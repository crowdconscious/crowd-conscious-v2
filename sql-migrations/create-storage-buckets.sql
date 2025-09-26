-- Create Supabase Storage Buckets and Policies
-- Run this in your Supabase SQL Editor

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('community-images', 'community-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('content-media', 'content-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('profile-pictures', 'profile-pictures', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public read access
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- Create storage policies for authenticated uploads
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- Create storage policies for authenticated updates  
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- Create storage policies for authenticated deletes
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );
