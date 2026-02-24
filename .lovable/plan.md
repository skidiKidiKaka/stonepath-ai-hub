

## Fix Peer Connect UX Issues

### Overview
Four fixes: reduce demo wait time, fix pre-selected answers on new cards, treat Alex as a regular user (not "Demo"), and fix the chat layout so your responses are always on the right.

### Changes

#### 1. Reduce Demo Wait Time

**File: `src/components/PeerConnectSession.tsx`**

Reduce the setTimeout delay from `800 + random * 700` (0.8-1.5s) to `300 + random * 400` (0.3-0.7s). The real latency comes from the edge function call itself, so the artificial delay before it should be minimal.

Also reduce the chat reply delay in **`src/components/PeerConnectChat.tsx`** from `1000 + random * 2000` (1-3s) to `500 + random * 1000` (0.5-1.5s).

#### 2. Fix Pre-Selected Answer on New Card

**File: `src/components/PeerConnectCard.tsx`**

The `selected` state is initialized to `""` but never resets when navigating to the next card. Add a `useEffect` that resets `selected` to `""` whenever `cardIndex` changes.

#### 3. Remove "Demo" Label and Allow Adding Alex as Friend

**File: `src/components/ChatHistory.tsx`**
- Change `"Alex (Demo)"` to `"Alex"` in the partner name mapping.

**File: `src/components/ChatHistoryDetail.tsx`**
- No changes needed here -- it receives `partnerName` as a prop from the parent.

**File: `src/components/PeerConnectChat.tsx`**
- Remove the line `if (isDemo) setAddedAsPeer(true);` so the "Add Peer" button shows for Alex too, allowing users to add Alex as a friend.

**File: `src/components/PeerConnectSession.tsx`**
- `partnerName` is already set to `"Alex"` (no "Demo" suffix), so no change needed.

#### 4. Fix Chat Layout: My Responses on Right, Partner on Left

The icebreaker summary in both `PeerConnectChat.tsx` and `ChatHistoryDetail.tsx` currently shows "Me" on the LEFT and the partner on the RIGHT. This is the opposite of the chat message layout. Swap them so:
- **Left side**: Partner (Alex) with their avatar and colored bubble
- **Right side**: You (Me) with your avatar and primary bubble

**Files: `src/components/PeerConnectChat.tsx` and `src/components/ChatHistoryDetail.tsx`**

In the icebreaker summary grid, swap the two column divs:
- First column (left): Partner avatar + partner answer in `bg-muted` style
- Second column (right): "You" answer in `bg-primary` style + "Me" avatar

The chat messages already have the correct layout (Me = right, partner = left) so no changes needed there.

### Technical Details

- **PeerConnectCard reset**: `useEffect(() => { setSelected(""); }, [cardIndex]);`
- **Delay reduction**: Simple constant changes in setTimeout calls
- **Layout swap**: Swap the order of the two grid children in the icebreaker summary, and swap their styling (partner gets `bg-muted`, you get `bg-primary`)
- No database or migration changes needed

