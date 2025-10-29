-- Fix category constraint to allow all categories from the UI
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_category_check;
ALTER TABLE groups ADD CONSTRAINT groups_category_check 
  CHECK (category IN ('study', 'hobby', 'sports', 'games', 'social', 'other'));

-- Fix infinite recursion in group_members RLS policies
DROP POLICY IF EXISTS "Members can view group members" ON group_members;
DROP POLICY IF EXISTS "Admins and users can leave groups" ON group_members;

-- Recreate policies without recursion
CREATE POLICY "Members can view group members" 
ON group_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can leave groups" 
ON group_members 
FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can remove members" 
ON group_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
    AND gm.id != group_members.id  -- Can't remove themselves this way
  )
);