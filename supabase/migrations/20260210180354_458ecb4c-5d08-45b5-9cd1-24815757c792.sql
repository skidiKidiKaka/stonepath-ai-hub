
-- Create pct_sessions table
CREATE TABLE public.pct_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pillar TEXT NOT NULL,
  topic TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pct_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.pct_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.pct_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.pct_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create pct_responses table
CREATE TABLE public.pct_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.pct_sessions(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  prompt_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pct_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own responses" ON public.pct_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pct_sessions WHERE id = pct_responses.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their own responses" ON public.pct_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.pct_sessions WHERE id = pct_responses.session_id AND user_id = auth.uid()));

-- Create pct_streaks table
CREATE TABLE public.pct_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_session_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pct_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks" ON public.pct_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own streaks" ON public.pct_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON public.pct_streaks FOR UPDATE USING (auth.uid() = user_id);
