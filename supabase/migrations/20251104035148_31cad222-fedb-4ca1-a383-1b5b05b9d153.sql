-- Create table for user availability
CREATE TABLE public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  week_start_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own availability
CREATE POLICY "Users can insert their own availability"
ON public.user_availability
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own availability"
ON public.user_availability
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own availability"
ON public.user_availability
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Anyone authenticated can view availability (for planning purposes)
CREATE POLICY "Authenticated users can view all availability"
ON public.user_availability
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_user_availability_user_week ON public.user_availability(user_id, week_start_date);

-- Create trigger for updated_at
CREATE TRIGGER update_user_availability_updated_at
BEFORE UPDATE ON public.user_availability
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();