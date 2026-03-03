

## Peer Connect Overhaul: Deep Questions, Depth Tracking, and AI Banter

### Problem
Currently Peer Connect uses only 3 AI-generated MCQ questions per session at a single depth level. The experience is shallow and doesn't build meaningful connection between peers.

### What Changes

**1. Static Question Bank (new data file)**
Create `src/data/peerConnectQuestions.ts` containing all 80+ questions organized by pillar and depth level. Each pillar has 10 questions with 5 options (A-E), tagged with a depth tier:
- **Level 1 (Surface)**: Questions 1-3 — light, introductory
- **Level 2 (Real)**: Questions 4-6 — personal, more revealing
- **Level 3 (Deep)**: Questions 7-8 — vulnerable, emotional
- **Level 4 (Unhinged)**: Questions 9-10 — raw, profound, no-holds-barred

The user's provided questions will be the foundation. Additional questions can be added per pillar to fill gaps. All 8 pillars covered: Mental Health, Academics, Friendships, Relationships, Peer Support, Fitness & Wellness, Career, Finance.

**2. Depth Progression with Checkpoints**
Modify `PeerConnectSession.tsx` to:
- Load questions from the static bank instead of AI-generated 3-card set
- Start at Level 1 and progress through levels
- After every 5 questions, show a **checkpoint screen** with two options: "Go Deeper" or "Start Chatting"
- Track current depth level visually (e.g., a depth meter/gauge showing Level 1-4 with labels like "Surface → Real → Deep → Unhinged")
- If they choose chat, they can return to questions via a "Resume Questions" button in the chat UI

**3. Connection Score System**
- After each question reveal, calculate a "Connection Score" based on answer similarity and depth reached
- Same answer = +3 points, adjacent answer = +1, deeper level = multiplier (Level 2 = 1.5x, Level 3 = 2x, Level 4 = 3x)
- Display a live "Connection Meter" showing the bond strength (0-100 scale with labels: Strangers → Acquaintances → Getting Real → Bonded → Soulbound)
- Store final connection_score on `peer_connect_sessions` table (column already exists)

**4. Chat ↔ Questions Toggle**
Modify `PeerConnectChat.tsx` to add a "Resume Questions" button in the chat header. This switches the phase back to "cards" in `PeerConnectSession`, preserving progress. The session component manages both phases and allows toggling.

**5. AI Banter in Chat**
Modify the `generate-peer-prompts` edge function's `demo-chat` handler and add a new `ai-banter` type:
- Every few messages (3-5), the AI injects a short, witty comment as a "system" message styled differently in the UI (not from either peer)
- The banter references their icebreaker answers AND the current chat context
- Styled as a distinct "AI wingman" bubble (different color, small text, with a sparkle icon)
- For demo mode, this integrates into the existing Alex chat flow
- For real peer mode, the banter is generated client-side and displayed locally (not persisted as a peer message)

**6. Edge Function Updates**
- `peer-connect-match/index.ts`: Instead of generating 3 AI questions, pull from the static bank. Send the full question set for the selected pillar to the session's `prompts` JSONB column.
- `generate-peer-prompts/index.ts`: Add `ai-banter` type that takes recent chat messages + answer summary and returns a witty one-liner. Update `spark` generation to be depth-aware.

### Files to Create
- `src/data/peerConnectQuestions.ts` — Static question bank (all 8 pillars, ~80 questions)

### Files to Modify
- `src/components/PeerConnectSession.tsx` — Depth progression, checkpoints every 5 questions, connection score, toggle between cards/chat
- `src/components/PeerConnectCard.tsx` — Show depth level indicator, 5 options instead of 4
- `src/components/PeerConnectChat.tsx` — "Resume Questions" button, AI banter bubbles, pass answer context for banter
- `src/components/PeerConnectLobby.tsx` — Update tip text for new question count
- `supabase/functions/peer-connect-match/index.ts` — Use static question bank, send full pillar question set
- `supabase/functions/generate-peer-prompts/index.ts` — Add `ai-banter` type, update spark for depth context

### No Database Changes Needed
The existing `peer_connect_sessions.connection_score` column and `peer_connect_sessions.prompts` JSONB column can store all new data. The `peer_connect_responses` table already tracks per-card answers.

