
-- 1. Block admin role assignment via trigger on profiles
CREATE OR REPLACE FUNCTION public.prevent_admin_self_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT: block admin role unless inserted by the handle_new_user trigger context
  -- We allow admin only if the role was already admin (set by a superuser/service role)
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    NEW.role := 'student';
  END IF;
  
  -- On UPDATE: prevent users from changing their own role
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_role_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_self_assign();

-- 2. Fix group_members INSERT policy to force role='member'
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id AND role = 'member');

-- 3. Fix profiles UPDATE policy to prevent role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()));
