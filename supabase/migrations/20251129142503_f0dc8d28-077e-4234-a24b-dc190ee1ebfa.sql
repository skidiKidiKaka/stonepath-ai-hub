-- Add recommended_clubs column to career_quiz_results table
ALTER TABLE career_quiz_results 
ADD COLUMN IF NOT EXISTS recommended_clubs jsonb DEFAULT '[]'::jsonb;