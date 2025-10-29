-- Create security definer function to check group membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = _group_id
    AND user_id = _user_id
  )
$$;

-- Recreate the SELECT policy without recursion
DROP POLICY IF EXISTS "Members can view group members" ON group_members;

CREATE POLICY "Members can view group members" 
ON group_members 
FOR SELECT 
USING (public.is_group_member(group_id, auth.uid()));