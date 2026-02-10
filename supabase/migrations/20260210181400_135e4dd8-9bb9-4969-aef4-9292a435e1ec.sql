
CREATE TABLE public.pct_prompt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT NOT NULL,
  topic TEXT NOT NULL,
  prompts JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pillar, topic)
);

ALTER TABLE public.pct_prompt_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.pct_prompt_cache FOR SELECT USING (true);
