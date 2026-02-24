

## Fix Chat History Bugs, Add Pillar Colors, and Clarify Friend Adding

### Overview
Three issues to address: (1) pillar badges in chat history need distinct colors per category, (2) demo peer icebreaker answers show as "---" because they are never saved to the database, and (3) clarify and improve the "Add Friend" flow.

### Changes

#### 1. Pillar-Colored Badges in Chat History

**File: `src/components/ChatHistory.tsx`**

Add a helper function that maps each pillar name to a specific Tailwind color class, following the existing project color scheme:

| Pillar | Color |
|--------|-------|
| Academics | Blue (`bg-blue-500`) |
| Mental Health | Purple (`bg-purple-500`) |
| Career | Orange (`bg-orange-500`) |
| Relationships | Pink (`bg-pink-500`) |
| Finance | Green (`bg-emerald-500`) |
| Fitness | Red (`bg-red-500`) |
| Friendships | Teal (`bg-teal-500`) |
| Bullying | Amber (`bg-amber-500`) |
| Default | Gray (current secondary) |

Apply these as inline className overrides on the `Badge` component for each session card.

#### 2. Fix Demo Peer Icebreaker Answers Not Persisting

**File: `src/components/PeerConnectSession.tsx`**

The bug: When in demo mode, the partner's icebreaker answer is only stored in React state (`setPartnerAnswers`) but never inserted into the `peer_connect_responses` database table. When `ChatHistoryDetail` later fetches responses from the DB, it finds nothing for the demo peer, so all answers show as "---".

Fix: After the demo AI selects an answer, also insert a row into `peer_connect_responses` with `user_id = DEMO_PEER_UUID`, `session_id`, `card_index`, and `selected_option`. This mirrors what happens for real peers and ensures the data persists for history viewing.

#### 3. Improve "Add Friend" Flow

Currently, the "Add Peer" button appears during an active Peer Connect chat session (in `PeerConnectChat.tsx`). For demo mode, it is intentionally hidden since Alex is not a real user.

To make the friend-adding flow clearer:
- **Keep the current behavior**: The "Add Peer" button appears during live chat with real peers
- **Add a small info note** in the Friends tab (`TrustedPeersList.tsx`) explaining how to add friends: "Connect with peers in Peer Connect sessions to add them as friends"
- This is by design -- friends are added organically through peer sessions, not manually

### Technical Details

- **Pillar color mapping**: A simple `Record<string, string>` lookup with a fallback for unknown pillars
- **Demo response persistence**: Add one `supabase.from("peer_connect_responses").insert(...)` call alongside the existing `setPartnerAnswers` state update in the demo answer handler (around line 174 of PeerConnectSession.tsx)
- **No database changes needed** -- all tables and policies already exist

