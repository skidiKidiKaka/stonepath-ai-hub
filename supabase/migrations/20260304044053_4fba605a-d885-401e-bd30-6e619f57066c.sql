
-- Fix 3: Add authorization check to is_group_member function
-- Only allow checking membership for self or groups the caller is already in
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
    AND (
      auth.uid() = _user_id
      OR EXISTS (
        SELECT 1 FROM group_members gm2
        WHERE gm2.group_id = _group_id AND gm2.user_id = auth.uid()
      )
    )
  )
$$;
