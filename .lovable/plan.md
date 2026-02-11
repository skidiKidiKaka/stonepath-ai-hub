

## Redesign Icebreaker Answers Summary in Peer Connect Chat

### Problem
The "Your Icebreaker Answers" section displays questions and answers in a cramped, inline format that makes it hard to distinguish who answered what. The answers run together with just a bullet separator.

### Solution
Redesign the answer summary section with chat-bubble-style cards for each person's answer, and expand the overall chat card width for more breathing room.

### Changes

**File: `src/components/PeerConnectChat.tsx`**

1. **Expand chat card width** - Change `max-w-2xl` to `max-w-3xl` on the outer Card component to give more horizontal space.

2. **Redesign answer summary layout** - Replace the current inline format with a structured card layout per question:
   - Each question displayed as a centered label/header
   - Two side-by-side chat bubbles below each question:
     - Left bubble (muted background) showing "You" + your answer
     - Right bubble (primary/purple background) showing partner name + their answer
   - Proper spacing and padding between question blocks
   - Small avatar initials on each bubble for visual identity

### Visual Result
Each icebreaker question will have its own mini-section with clearly separated, color-coded chat bubbles -- making it immediately obvious who said what, with a clean and symmetric layout.

### Technical Details
- Only one file modified: `src/components/PeerConnectChat.tsx`
- The answer summary JSX block (approx. lines 173-189) will be rewritten
- The outer Card className on line 165 will be updated from `max-w-2xl` to `max-w-3xl`
- Uses existing Tailwind classes and design patterns already present in the component
