

## Demo Mode: AI-Powered Dummy Peer for Testing

### Overview
When no real users are available, the `peer-connect-match` edge function will instantly create a session with a fake "demo peer" instead of putting you in the waiting lobby. The AI will answer MCQ cards with realistic delays and chat back naturally -- all appearing as if you're talking to a real person.

### How It Works

1. **Matching**: The `peer-connect-match` edge function gets a new `demo: true` flag. Instead of checking the lobby, it immediately creates a session with a fake partner ID (a fixed UUID like `00000000-0000-0000-0000-000000000001`) and a fake profile name (e.g., "Alex").
2. **MCQ Answers**: The `PeerConnectSession` component detects the demo partner ID. After the real user submits their answer, it waits 2-4 seconds (random delay to feel realistic), then the AI picks an answer for the dummy peer by calling `generate-peer-prompts` with a new `type: "demo-answer"` request that returns a plausible option index.
3. **Chat**: The `PeerConnectChat` component detects the demo partner. When the user sends a message, it calls `generate-peer-prompts` with `type: "demo-chat"` to get an AI response, then inserts it into `peer_connect_messages` as if the dummy peer sent it -- with a short typing delay.

### What Changes

**1. Database: Insert a dummy profile**
- Insert a row into `profiles` for the demo peer UUID so the name lookup works: `{ user_id: "00000000-...-000001", full_name: "Alex" }`

**2. Edge function: `peer-connect-match` (modified)**
- Accept optional `demo: true` in the request body
- When demo mode: skip lobby, generate prompts, create a session with `user_a = real user` and `user_b = demo UUID`, return immediately as "matched"

**3. Edge function: `generate-peer-prompts` (modified)**
- New `type: "demo-answer"`: Given a question and its options, AI picks a realistic option index (returns `{ selectedOption: 2 }`)
- New `type: "demo-chat"`: Given conversation history and context, AI generates a natural teen-friendly chat reply (returns `{ reply: "..." }`)

**4. Component: `PeerConnectSession.tsx` (modified)**
- Detect demo mode via partner ID matching the known demo UUID
- After user submits an MCQ answer, wait 2-4s then call `generate-peer-prompts` with `type: "demo-answer"` and simulate the partner's answer by setting it in state (no DB insert needed since there's no real partner subscribing)

**5. Component: `PeerConnectChat.tsx` (modified)**
- Detect demo mode via partner ID
- After user sends a message, wait 1-3s then call `generate-peer-prompts` with `type: "demo-chat"`, insert the AI reply into `peer_connect_messages` with the demo user ID so it appears as a partner message

**6. Component: `PeerConnectLobby.tsx` (modified)**
- Pass `demo: true` to the `peer-connect-match` call so it skips the waiting phase entirely

**7. Page: `HeadspaceHangout.tsx` (modified)**
- Since this is for testing, we can either always use demo mode or add a small toggle. For simplicity, we'll default to demo mode when Peer Connect is selected (can be toggled off later when real users exist).

### Technical Details

**Demo peer UUID:** `00000000-0000-0000-0000-000000000001`

**New AI call types in `generate-peer-prompts`:**

```text
// Demo answer selection
type: "demo-answer"
body: { type: "demo-answer", question: "...", options: ["..."] }
returns: { selectedOption: 2 }

// Demo chat reply  
type: "demo-chat"
body: { type: "demo-chat", messages: [...], pillar: "Mental Health" }
returns: { reply: "That's so true! I usually..." }
```

**Realistic delays:**
- MCQ answer: random 2-4 second delay before "partner answers"
- Chat reply: random 1-3 second delay before message appears
- This makes it feel like a real person is on the other end

**Files modified:**
- `supabase/functions/peer-connect-match/index.ts` -- add demo mode branch
- `supabase/functions/generate-peer-prompts/index.ts` -- add demo-answer and demo-chat types
- `src/components/PeerConnectLobby.tsx` -- pass demo flag
- `src/components/PeerConnectSession.tsx` -- simulate partner MCQ answers via AI
- `src/components/PeerConnectChat.tsx` -- simulate partner chat replies via AI
- `src/pages/HeadspaceHangout.tsx` -- enable demo mode by default

**Database migration:**
- Insert demo peer profile row
