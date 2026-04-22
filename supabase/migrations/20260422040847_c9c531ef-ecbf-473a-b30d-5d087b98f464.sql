
-- Allow students to create their own pending link with a code
CREATE POLICY "Students can create their own pending link"
ON public.parent_student_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id AND status = 'pending');

-- Ensure link_code is unique so students can't accidentally collide
CREATE UNIQUE INDEX IF NOT EXISTS parent_student_links_link_code_unique
ON public.parent_student_links (link_code)
WHERE link_code IS NOT NULL;

-- Server-side function for parents to claim a pending link by code.
-- Runs with definer privileges so it can read pending rows the parent
-- can't otherwise SELECT, and it enforces parent role + status checks.
CREATE OR REPLACE FUNCTION public.claim_parent_link(_code text)
RETURNS TABLE(success boolean, message text, student_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_parent uuid := auth.uid();
BEGIN
  IF v_parent IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::text, NULL::uuid;
    RETURN;
  END IF;

  IF NOT public.has_role(v_parent, 'parent') THEN
    RETURN QUERY SELECT false, 'Only parent accounts can link'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_link
  FROM public.parent_student_links
  WHERE link_code = upper(trim(_code))
  LIMIT 1;

  IF v_link IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid link code'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_link.status = 'active' AND v_link.parent_id <> v_link.student_id THEN
    RETURN QUERY SELECT false, 'This code is already claimed'::text, NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.parent_student_links
  SET parent_id = v_parent,
      status = 'active',
      link_code = NULL
  WHERE id = v_link.id;

  RETURN QUERY SELECT true, 'Linked successfully'::text, v_link.student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_parent_link(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_parent_link(text) TO authenticated;
