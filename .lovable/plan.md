

## Chat History & Friends System for Headspace Hangout

### Overview
Add the ability for users to view past Peer Connect chat sessions, delete them, and manage a friends/contacts list from peers they've connected with -- all accessible from the Headspace Hangout page.

### Changes

#### 1. New "Chat History" View in Headspace Hangout

**File: `src/pages/HeadspaceHangout.tsx`**

Add a new view state `"history"` and a button in the pillars view (next to the mode toggle) to access it. This view will:

- Fetch all `peer_connect_sessions` for the current user (where `user_a` or `user_b` matches their ID and `status = 'completed'`)
- Display each session as a card showing: partner name, pillar, date, and a preview snippet of the last message
- Clicking a card opens a read-only chat view showing the full conversation
- Each card has a delete button (with confirmation dialog) that deletes the session and its associated messages/responses

#### 2. New Component: `ChatHistory`

**New file: `src/components/ChatHistory.tsx`**

- Fetches completed `peer_connect_sessions` joined with partner profile data
- Fetches last message from `peer_connect_messages` for each session as preview
- Renders a list of session cards with partner avatar, name, pillar badge, date, and message preview
- Delete action: deletes from `peer_connect_messages`, `peer_connect_responses`, then `peer_connect_sessions`
- "View Chat" action: opens a read-only version of the conversation

#### 3. New Component: `ChatHistoryDetail`

**New file: `src/components/ChatHistoryDetail.tsx`**

- Read-only view of a past conversation
- Fetches all messages for the session, displays them in the same bubble format as `PeerConnectChat`
- Shows the icebreaker answer summary at the top (from session prompts + responses)
- Back button returns to history list

#### 4. "Friends" / Trusted Peers List

**New file: `src/components/TrustedPeersList.tsx`**

- Fetches from `trusted_peers` table joined with `profiles` to get names/avatars
- Displays each friend as a card with avatar, name, and date added
- "Remove" button to delete the trusted peer relationship
- "Chat" button -- navigates to start a new Peer Connect session with that specific peer (future enhancement, for now shows "Coming soon" toast)

#### 5. Add Tab Navigation in Headspace Hangout

Add a tab bar or secondary navigation in the Headspace Hangout header area with:
- **Reflect** (default -- current pillars/session flow)
- **Chat History** (past peer connect conversations)
- **Friends** (trusted peers list)

#### 6. Database: Add DELETE Policies

**SQL Migration** to allow users to delete their own session data:

- `peer_connect_sessions`: Allow DELETE where `user_a = auth.uid() OR user_b = auth.uid()`
- `peer_connect_messages`: Allow DELETE where the user is a participant in the session
- `peer_connect_responses`: Allow DELETE where the user is a participant in the session
- `trusted_peers`: Already has ALL policy, so DELETE is covered

#### 7. Update `PeerConnectChat` "Add Peer" Flow

In `src/components/PeerConnectChat.tsx`, the "Add Peer" button already inserts into `trusted_peers`. Add a toast that says "Added as Friend!" instead of "Added as Trusted Peer!" to match the new terminology.

### Technical Details

- **Chat History fetching**: Query `peer_connect_sessions` with `.or('user_a.eq.{userId},user_b.eq.{userId}')` and `status = 'completed'`, ordered by `completed_at desc`
- **Partner profile lookup**: For each session, determine the partner ID (whichever of `user_a`/`user_b` is not the current user), then batch-fetch profiles
- **Delete cascade**: When deleting a session, first delete `peer_connect_messages` and `peer_connect_responses` for that session_id, then delete the session itself
- **Friends list**: Simple query on `trusted_peers` where `user_id = auth.uid()`, joined with `profiles` on `peer_id = profiles.user_id`
- **Read-only chat**: Reuse the bubble styling from `PeerConnectChat` but without the input form
- **No new tables needed** -- all data already exists in `peer_connect_sessions`, `peer_connect_messages`, `peer_connect_responses`, and `trusted_peers`

