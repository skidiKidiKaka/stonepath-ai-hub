
-- Fix mentor_requests: Remove anonymous view access
DROP POLICY IF EXISTS "Users can view their own mentor requests" ON public.mentor_requests;

CREATE POLICY "Users can view their own mentor requests"
ON public.mentor_requests FOR SELECT
USING (auth.uid() = user_id);
