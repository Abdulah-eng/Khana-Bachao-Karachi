-- =============================================
-- FIX STORAGE BUCKET POLICIES
-- Run this in Supabase SQL Editor
-- =============================================

-- First, enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload to donation-images" ON storage.objects;

-- Policy 1: Allow anyone to read/view images from donation-images bucket
CREATE POLICY "Public read access for donation images"
ON storage.objects FOR SELECT
USING (bucket_id = 'donation-images');

-- Policy 2: Allow authenticated users to upload to donation-images bucket
CREATE POLICY "Authenticated users can upload donation images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'donation-images');

-- Policy 3: Allow users to update their own uploads
CREATE POLICY "Users can update their own donation images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'donation-images')
WITH CHECK (bucket_id = 'donation-images');

-- Policy 4: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own donation images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'donation-images');

-- Verify policies were created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
