
-- Fix 1: Tighten profiles SELECT policy to restrict PII exposure
-- Drop the overly permissive "Authenticated users can view profiles" policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a scoped policy: users can view profiles of group co-members and peer connect partners
CREATE POLICY "Users can view related profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM peer_connect_sessions pcs
    WHERE (pcs.user_a = auth.uid() AND pcs.user_b = profiles.user_id)
       OR (pcs.user_b = auth.uid() AND pcs.user_a = profiles.user_id)
  )
  OR EXISTS (
    SELECT 1 FROM trusted_peers tp
    WHERE tp.user_id = auth.uid() AND tp.peer_id = profiles.user_id
  )
);
