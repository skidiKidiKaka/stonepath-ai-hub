
-- Remove redundant policy - already covered by "Users can view related profiles"
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
