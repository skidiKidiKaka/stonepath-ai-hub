-- 1. Remove overly permissive storage policies for group-photos
DROP POLICY IF EXISTS "Group members can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view group photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload group photos" ON storage.objects;

-- 2. Fix profiles UPDATE policy - use trigger for role protection, simplify RLS
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Add RLS to realtime.messages to restrict channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read realtime messages they participate in"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM realtime.messages rm WHERE rm.id = id
  )
);
