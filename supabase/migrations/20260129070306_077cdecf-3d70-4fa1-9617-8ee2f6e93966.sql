-- Fix 1: Bullying reports - explicitly deny SELECT access (insert-only table)
-- Reports should only be submitted, never viewed by users to protect victims
DROP POLICY IF EXISTS "No select access to bullying reports" ON public.bullying_reports;
CREATE POLICY "No select access to bullying reports"
  ON public.bullying_reports FOR SELECT
  USING (false);

-- Fix 2: User availability - restrict to self and group members only
-- Prevents stalkers from viewing all student schedules
DROP POLICY IF EXISTS "Authenticated users can view all availability" ON public.user_availability;

CREATE POLICY "Users can view their own availability"
  ON public.user_availability FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Group members can view each other availability"
  ON public.user_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = user_availability.user_id
    )
  );