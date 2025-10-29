-- Create table for counselor session requests
CREATE TABLE public.counselor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  urgency_level TEXT NOT NULL,
  preferred_contact TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.counselor_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit counselor requests
CREATE POLICY "Anyone can submit counselor requests"
ON public.counselor_requests
FOR INSERT
WITH CHECK (true);

-- Allow users to view their own counselor requests
CREATE POLICY "Users can view their own counselor requests"
ON public.counselor_requests
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);