

## Peer Connect -- MCQ Icebreaker Sessions Between Two Users

### Overview
Add a new "Peer Connect" mode to Headspace Hangout where two users get matched by pillar, answer the same 5 MCQ icebreaker questions independently, then reveal each other's answers side-by-side -- sparking real conversation. After all 5 cards, a live chat unlocks so they can keep talking.

### User Flow

1. From Headspace Hangout, user toggles to "Peer Connect" mode
2. Picks a pillar (e.g., Mental Health) and enters a matching lobby
3. When another user picks the same pillar, they're paired instantly (via Realtime)
4. Both see 5 MCQ cards one at a time -- same question, 4 options each
5. After both pick an answer, answers are revealed side-by-side with a "Connection Spark" (AI comment on the match/difference)
6. After all 5 cards, a real-time chat opens for free conversation
7. Either user can end the session; both earn 15 points and can add each other as "Trusted Peers"

### What Gets Built

**Database (5 new tables + realtime)**

- `peer_connect_lobby` -- matching queue (user_id, pillar, status, matched_with, session_id)
- `peer_connect_sessions` -- paired session (user_a, user_b, pillar, prompts as JSONB, status, connection_score, summary)
- `peer_connect_responses` -- MCQ answers (session_id, user_id, card_index, selected_option)
- `peer_connect_messages` -- free chat after cards complete (session_id, user_id, content)
- `trusted_peers` -- opt-in connections after sessions (user_id, peer_id)

All tables have RLS scoped to session participants. Realtime enabled on lobby, responses, and messages tables.

**Edge Functions (2 new)**

- `peer-connect-match` -- Atomic server-side matching logic:
  - Checks lobby for another waiting user on the same pillar
  - Creates a session with 5 MCQ prompts (from cache or AI)
  - Updates both lobby entries atomically
  - Returns session details

- `generate-peer-prompts` -- Generates 5 MCQ icebreaker questions:
  - Each has a question + 4 options (no correct answer -- these are personality/preference questions)
  - Caches results in `pct_prompt_cache` with a `peer` mode marker
  - Also generates "Connection Spark" comments when given both users' answers

**Frontend Components (4 new + 2 modified)**

- `PeerConnectLobby.tsx` -- Waiting screen with pulsing animation, subscribes to lobby changes via Realtime, auto-matches when partner found
- `PeerConnectSession.tsx` -- The main MCQ card-by-card flow:
  - Shows question + 4 radio button options
  - After user picks, shows "Waiting for partner..." until both submit
  - Reveals both answers side-by-side with flip animation
  - Shows AI "Connection Spark" comment
  - After 5 cards, transitions to chat
- `PeerConnectCard.tsx` -- Individual MCQ card component with selection state and reveal animation
- `PeerConnectChat.tsx` -- Lightweight real-time chat (similar pattern to GroupChat but scoped to the session), shows card answers above as conversation starters
- `HeadspaceHangout.tsx` (modified) -- Add "Solo Reflection" / "Peer Connect" toggle at top of pillars view
- `PCTStats.tsx` (modified) -- Show peer session count and trusted peers count alongside existing stats

### Technical Details

**Database migration SQL:**

```text
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
```

**Edge function: `peer-connect-match`**
- POST with `{ pillar }` body
- Uses service role to atomically find + claim a waiting lobby entry
- Generates or loads 5 MCQ prompts for the pillar
- Creates session, updates both lobby rows, returns session data

**Edge function: `generate-peer-prompts`**
- Generates personality/icebreaker MCQs (not knowledge-based -- no right answers)
- Example: "When you're stressed, you usually..." with options like "Listen to music", "Talk to someone", "Go for a walk", "Write it down"
- Also handles "spark" generation: given two selected options, produces a warm 1-sentence connection comment

**MCQ prompt format (JSONB):**
```text
{
  "prompts": [
    {
      "question": "When you're having a tough day, what helps most?",
      "options": ["Talking to a friend", "Being alone for a bit", "Doing something active", "Watching/reading something funny"]
    }
  ]
}
```

**Gamification:**
- Peer sessions award 15 points (vs 10 for solo)
- New stats in PCTStats: "Peer Sessions" count, "Trusted Peers" count
- Uses existing `pct_streaks` table (adds to total_sessions and total_points)

**New files:**
- `src/components/PeerConnectLobby.tsx`
- `src/components/PeerConnectSession.tsx`
- `src/components/PeerConnectCard.tsx`
- `src/components/PeerConnectChat.tsx`
- `supabase/functions/peer-connect-match/index.ts`
- `supabase/functions/generate-peer-prompts/index.ts`

**Modified files:**
- `src/pages/HeadspaceHangout.tsx` -- add mode toggle and Peer Connect flow
- `src/components/PCTStats.tsx` -- add peer stats
- `supabase/config.toml` -- register new edge functions

