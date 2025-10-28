-- Create table for career quiz results
CREATE TABLE public.career_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  answers JSONB NOT NULL,
  result_type TEXT NOT NULL,
  feedback TEXT NOT NULL,
  recommended_careers JSONB NOT NULL,
  quote TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.career_quiz_results ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own quiz results" 
ON public.career_quiz_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz results" 
ON public.career_quiz_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_career_quiz_results_user_id ON public.career_quiz_results(user_id);
CREATE INDEX idx_career_quiz_results_created_at ON public.career_quiz_results(created_at DESC);