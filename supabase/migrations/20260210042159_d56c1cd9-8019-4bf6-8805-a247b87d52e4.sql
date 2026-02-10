
-- Table to store per-event availability (each row = one available hour slot)
CREATE TABLE public.event_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  slot_hour INTEGER NOT NULL CHECK (slot_hour >= 0 AND slot_hour <= 23),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, slot_date, slot_hour)
);

-- Enable RLS
ALTER TABLE public.event_availability ENABLE ROW LEVEL SECURITY;

-- Members of the event's group can view all availability for that event
CREATE POLICY "Group members can view event availability"
  ON public.event_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = event_availability.event_id
        AND gm.user_id = auth.uid()
    )
  );

-- Members can insert their own availability
CREATE POLICY "Members can add their own availability"
  ON public.event_availability
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = event_availability.event_id
        AND gm.user_id = auth.uid()
    )
  );

-- Users can delete their own availability
CREATE POLICY "Users can delete their own availability"
  ON public.event_availability
  FOR DELETE
  USING (auth.uid() = user_id);
