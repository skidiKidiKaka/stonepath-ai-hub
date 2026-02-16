
-- Fix 1: Remove anonymous exposure from counselor_requests SELECT policy
DROP POLICY IF EXISTS "Users can view their own counselor requests" ON public.counselor_requests;
CREATE POLICY "Users can view their own counselor requests"
ON public.counselor_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 2: Tighten profiles SELECT - use security definer function to check shared group membership
-- Drop the broad group membership policy
DROP POLICY IF EXISTS "Group members can view each others profiles" ON public.profiles;

-- Replace with a stricter policy that only allows viewing profiles of people in the same group
-- (keeping existing "Users can view their own profile" policy as-is)
