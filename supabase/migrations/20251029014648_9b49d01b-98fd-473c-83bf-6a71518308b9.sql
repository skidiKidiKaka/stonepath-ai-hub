-- Create table for anonymous relationship questions
CREATE TABLE public.relationship_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.relationship_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit questions (anonymous)
CREATE POLICY "Anyone can submit questions"
ON public.relationship_questions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view approved questions
CREATE POLICY "Anyone can view approved questions"
ON public.relationship_questions
FOR SELECT
USING (is_approved = true);