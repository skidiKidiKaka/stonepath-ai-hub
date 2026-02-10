

## What is PCT?

**Peer Conversation Therapy (PCT)** is the core framework of the Stone Path Project. It's a structured, non-professional conversation model where students support each other through guided prompts inspired by CBT and DBT techniques. Key concepts:

- **Person A** (the supporter) notices a friend struggling and initiates a guided conversation with **Person B**
- It focuses on the space *before* issues need professional help -- teaching emotional openness and communication
- Sessions use a **bank of guided questions** organized by the 8 pillars (mental health, academics, friendships, etc.)
- Each prompt includes tips and suggested responses; both participants press "Done" to move through
- It's delivered through a feature called **"Headspace Hangout"** -- a gamified space with streaks, points, and rewards so it feels engaging rather than clinical

---

## Implementation Plan: "Headspace Hangout" (PCT Feature)

### Overview

Add a new "Headspace Hangout" page accessible from the dashboard. It will let users start guided peer conversations organized by the 8 pillars, with AI-generated prompts, a step-by-step flow, and a points/streak tracking system.

### What Gets Built

**1. New Route and Page: `/headspace-hangout`**
- A dedicated page with the 8 pillars displayed as selectable cards
- Each pillar leads to a set of guided conversation modules (e.g., "Managing Anxiety," "Handling Peer Pressure")

**2. PCT Session Flow (Solo Reflection Mode first)**
Since real-time peer-to-peer pairing requires significant infrastructure (matching, presence, chat), we start with a **solo guided reflection** mode that mirrors the PCT structure:
- User selects a pillar and a topic
- AI generates 5-7 guided prompts (inspired by CBT/DBT) for that topic
- User reflects and writes responses to each prompt, pressing "Next" to proceed
- At the end, AI provides a supportive summary and actionable takeaways
- Session is saved to the database for journaling/history

**3. Database Tables**
- `pct_sessions` -- tracks each session (user, pillar, topic, started_at, completed_at, streak_count)
- `pct_responses` -- stores individual prompt responses per session
- `pct_streaks` -- tracks daily streaks and total points per user

**4. Gamification**
- Points awarded for completing sessions (e.g., 10 points per session)
- Daily streak counter (consecutive days with at least 1 session)
- Simple progress display showing total sessions, current streak, and points

**5. Dashboard Integration**
- Add a "Headspace Hangout" card to the main dashboard linking to the new page
- Show current streak and points on the dashboard card

**6. Edge Function: `generate-pct-prompts`**
- Uses Lovable AI to generate contextual, pillar-specific guided prompts
- System prompt instructs the AI to create CBT/DBT-inspired reflection questions appropriate for high school students
- Also generates a supportive summary after the session completes

### Technical Details

- **New files**: `src/pages/HeadspaceHangout.tsx`, `src/components/PCTSession.tsx`, `src/components/PCTStats.tsx`, `supabase/functions/generate-pct-prompts/index.ts`
- **Modified files**: `src/App.tsx` (add route), `src/pages/Dashboard.tsx` (add card)
- **Database**: 3 new tables with RLS policies scoped to authenticated users viewing/editing their own data
- **AI model**: `google/gemini-3-flash-preview` via Lovable AI for prompt generation

### Future Expansion (not in this phase)
- Real-time peer pairing (Person A + Person B) with live chat
- Leaderboards across groups
- Badge system and rewards store

