-- Create table for anonymous bullying reports
CREATE TABLE public.bullying_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for mentor requests
CREATE TABLE public.mentor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  request_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bullying_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit bullying reports anonymously
CREATE POLICY "Anyone can submit bullying reports"
ON public.bullying_reports
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to submit mentor requests
CREATE POLICY "Users can submit mentor requests"
ON public.mentor_requests
FOR INSERT
WITH CHECK (true);

-- Allow users to view their own mentor requests
CREATE POLICY "Users can view their own mentor requests"
ON public.mentor_requests
FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);