
-- Lobby for matching
CREATE TABLE public.peer_connect_lobby (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pillar TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  matched_with UUID,
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.peer_connect_lobby ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lobby" ON public.peer_connect_lobby FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sessions
CREATE TABLE public.peer_connect_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  pillar TEXT NOT NULL,
  prompts JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  connection_score INTEGER,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.peer_connect_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view" ON public.peer_connect_sessions FOR SELECT USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Participants can update" ON public.peer_connect_sessions FOR UPDATE USING (auth.uid() IN (user_a, user_b));

-- MCQ Responses
CREATE TABLE public.peer_connect_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.peer_connect_sessions(id),
  user_id UUID NOT NULL,
  card_index INTEGER NOT NULL,
  selected_option INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id, card_index)
);
ALTER TABLE public.peer_connect_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can insert" ON public.peer_connect_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM peer_connect_sessions WHERE id = session_id AND auth.uid() IN (user_a, user_b)));
CREATE POLICY "Participants can view" ON public.peer_connect_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM peer_connect_sessions WHERE id = session_id AND auth.uid() IN (user_a, user_b)));

-- Chat messages
CREATE TABLE public.peer_connect_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.peer_connect_sessions(id),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.peer_connect_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can insert" ON public.peer_connect_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM peer_connect_sessions WHERE id = session_id AND auth.uid() IN (user_a, user_b)));
CREATE POLICY "Participants can view" ON public.peer_connect_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM peer_connect_sessions WHERE id = session_id AND auth.uid() IN (user_a, user_b)));

-- Trusted peers
CREATE TABLE public.trusted_peers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  peer_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, peer_id)
);
ALTER TABLE public.trusted_peers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own peers" ON public.trusted_peers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_connect_lobby;
ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_connect_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_connect_messages;
