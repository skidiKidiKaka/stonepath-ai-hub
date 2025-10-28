-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own assignments" 
ON public.assignments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assignments" 
ON public.assignments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments" 
ON public.assignments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignments" 
ON public.assignments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_assignments_user_id ON public.assignments(user_id);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);