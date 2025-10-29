-- Fix RLS policies for groups table
-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Group admins can delete groups" ON groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON groups;

-- Create correct policies
CREATE POLICY "Group admins can delete groups" 
ON groups 
FOR DELETE 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid() 
    AND group_members.role = 'admin'
  )
);

CREATE POLICY "Group admins can update groups" 
ON groups 
FOR UPDATE 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_members.group_id = groups.id 
    AND group_members.user_id = auth.uid() 
    AND group_members.role = 'admin'
  )
);