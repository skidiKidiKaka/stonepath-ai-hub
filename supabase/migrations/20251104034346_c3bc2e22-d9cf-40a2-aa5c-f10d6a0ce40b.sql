-- Add type column to assignments table to support both assignments and exams
ALTER TABLE public.assignments 
ADD COLUMN type TEXT NOT NULL DEFAULT 'assignment' CHECK (type IN ('assignment', 'exam'));