
-- Table to store scheduling polls within groups
CREATE TABLE public.availability_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  poll_dates DATE[] NOT NULL,
  earliest_hour INTEGER NOT NULL DEFAULT 9,
  latest_hour INTEGER NOT NULL DEFAULT 17,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store individual slot responses
CREATE TABLE public.availability_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.availability_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  slot_hour INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, slot_date, slot_hour)
);

-- Enable RLS
ALTER TABLE public.availability_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_responses ENABLE ROW LEVEL SECURITY;

-- Polls: group members can view
CREATE POLICY "Group members can view polls"
  ON public.availability_polls FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

-- Polls: group members can create
CREATE POLICY "Group members can create polls"
  ON public.availability_polls FOR INSERT
  WITH CHECK (auth.uid() = created_by AND public.is_group_member(group_id, auth.uid()));

-- Polls: creator can delete
CREATE POLICY "Poll creator can delete"
  ON public.availability_polls FOR DELETE
  USING (auth.uid() = created_by);

-- Responses: group members can view all responses for polls in their groups
CREATE POLICY "Group members can view responses"
  ON public.availability_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.availability_polls ap
    WHERE ap.id = availability_responses.poll_id
    AND public.is_group_member(ap.group_id, auth.uid())
  ));

-- Responses: users can add their own
CREATE POLICY "Users can add their own responses"
  ON public.availability_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.availability_polls ap
    WHERE ap.id = availability_responses.poll_id
    AND public.is_group_member(ap.group_id, auth.uid())
  ));

-- Responses: users can delete their own
CREATE POLICY "Users can delete their own responses"
  ON public.availability_responses FOR DELETE
  USING (auth.uid() = user_id);
