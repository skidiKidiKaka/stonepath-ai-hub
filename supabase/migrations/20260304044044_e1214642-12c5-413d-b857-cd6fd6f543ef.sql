
-- Fix 2 retry: Drop existing policies and recreate
DROP POLICY IF EXISTS "Group members can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Group members can view group photos" ON storage.objects;

CREATE POLICY "Group members can view group photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'group-photos'
  AND public.is_group_member(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
);

CREATE POLICY "Group members can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'group-photos'
  AND public.is_group_member(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
);
