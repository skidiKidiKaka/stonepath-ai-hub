
-- Add explicit DENY policies for UPDATE and DELETE on bullying_reports
-- RLS already blocks these by default, but explicit policies are defense-in-depth
CREATE POLICY "No updates to bullying reports"
ON public.bullying_reports FOR UPDATE
USING (false);

CREATE POLICY "No deletes on bullying reports"
ON public.bullying_reports FOR DELETE
USING (false);
