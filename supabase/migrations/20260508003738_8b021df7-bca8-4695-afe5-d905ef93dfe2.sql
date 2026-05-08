
-- Tighten storage policies for workshop-photos: users can only upload/update/delete files inside their own user-id folder
DROP POLICY IF EXISTS "Authenticated can upload workshop photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update workshop photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete workshop photos" ON storage.objects;

CREATE POLICY "Users can upload to own folder in workshop-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workshop-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own files in workshop-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'workshop-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own files in workshop-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workshop-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
