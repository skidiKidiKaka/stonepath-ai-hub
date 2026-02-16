
-- Make group-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'group-photos';

-- Add storage RLS policies for group-photos
CREATE POLICY "Authenticated users can upload group photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'group-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view group photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own group photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'group-photos' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]);
