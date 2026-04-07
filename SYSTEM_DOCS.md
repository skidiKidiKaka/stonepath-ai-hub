# Stone Path AI Hub — Complete System Documentation

> **Audience**: Engineers who need to understand, debug, modify, or extend this system.
> **Last Updated**: April 2026 | **Version**: 2.0.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Authentication & Role System](#3-authentication--role-system)
4. [Data Flow](#4-data-flow)
5. [Database Schema](#5-database-schema)
6. [Edge Functions (APIs)](#6-edge-functions-apis)
7. [Frontend Component Architecture](#7-frontend-component-architecture)
8. [Real-Time Features](#8-real-time-features)
9. [Security Model](#9-security-model)
10. [Cross-Role Communication](#10-cross-role-communication)
11. [Key Decisions & Tradeoffs](#11-key-decisions--tradeoffs)
12. [Edge Cases & Failure Modes](#12-edge-cases--failure-modes)
13. [Setup & Usage](#13-setup--usage)
14. [Limitations & Technical Debt](#14-limitations--technical-debt)

---

## 1. Overview

### What It Does

Stone Path AI Hub is a comprehensive support platform for high school students, their parents, and school administrators. It provides AI-powered guidance, task management, mood tracking, peer connection, and educational tools across eight life pillars:

| Pillar | Purpose | Key Features |
|--------|---------|-------------|
| **Career** | Career exploration | Quiz assessments, resume builder, interview coaching |
| **Mental Health** | Emotional wellness | Mood tracker (7-level scale), mood charts, counselor requests |
| **Academics** | Study management | Assignment CRUD, Pomodoro timer, AI note generation (4 formats) |
| **Friendships** | Social coordination | Groups, real-time chat, availability polls, event planning |
| **Relationships** | Guidance | Anonymous Q&A board with admin approval |
| **Peer Support** | Anti-bullying | Anonymous incident reporting, mentor matching |
| **Fitness** | Physical health | Workout logging, streak tracking (auto-calculated via trigger) |
| **Finance** | Money management | Transactions, budget categories, savings goals, chore allowances |

### Why It Exists

High school students face challenges across multiple life domains simultaneously. Existing tools address one domain at a time. Stone Path integrates all of these into a single platform with AI assistance, and extends visibility to parents and school administrators through a multi-role panel system.

### Three Roles

- **Student**: Full access to all 8 pillars, Headspace Hangout, Peer Connect, task planner, AI chat
- **Parent**: Read-only view of linked child's mood entries and assignments, school announcements, cross-role messaging
- **Admin (School)**: Manage bullying reports, counselor/mentor requests, publish school-wide announcements

---

## 2. Architecture

### High-Level System Diagram

```
CLIENT (Browser)
  React 18 SPA  |  Vite 5  |  TypeScript 5  |  Tailwind CSS 3
  Pages (16)  |  Components (30+ feature, 40+ UI shadcn)
  Hooks (useUserRole, useMobile)
  Supabase Client (auth, from, functions, storage, channel)
              |
              | HTTPS / WSS
              v
SUPABASE PLATFORM
  Auth Service          PostgreSQL              Edge Functions (19)
  - Email/Password      - 35 tables             - ai-chat (SSE streaming)
  - JWT tokens          - RLS on all tables      - generate-notes
  - Auto-confirm        - 7 database functions   - generate-quiz
  - Password reset      - Triggers               - generate-career-*
                                                 - finance-insights
  Realtime              Storage                  - peer-connect-match
  - WebSocket           - avatars (public)       - fetch-real-news
  - postgres_changes    - group-photos (private) - ... (12 more)
  - group_messages                                       |
  - panel_messages                                       v
  - peer_connect_lobby                           External AI Providers
                                                 - Lovable AI Gateway (Gemini 2.5 Flash)
                                                 - DeepSeek (optional)
```

### Component Responsibilities

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| **Entry** | `main.tsx` | Mounts React app to DOM |
| **Root** | `App.tsx` | Wraps app in ThemeProvider, QueryClientProvider, TooltipProvider, BrowserRouter. Defines all 17 routes. |
| **Auth** | `Auth.tsx` | Login/signup with role selection (student/parent). Calls `supabase.auth.signUp` with `role` in `user_metadata`. |
| **Router** | `Dashboard.tsx` | Reads `useUserRole()` hook. Renders ParentDashboard, AdminDashboard, or student content based on role. |
| **State** | `TanStack Query` | Used in `Finance.tsx` for `useQuery`. Most other pages use `useState` + `useEffect`. |
| **AI** | `AiChatDialog.tsx` | Floating chat dialog. Streams SSE responses from `ai-chat` edge function. Supports file upload. |
| **Realtime** | `GroupChat.tsx`, `Messages.tsx` | Subscribe to `postgres_changes` on group_messages and panel_messages. |

### Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool, HMR |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui | ~40 components | Accessible UI primitives (Radix-based) |
| TanStack Query | 5.83.0 | Server state management |
| React Router DOM | 6.30.1 | Client-side routing |
| Zod | 3.25.76 | Runtime schema validation |
| Recharts | 2.15.4 | Charts (mood, budget, fitness) |
| DOMPurify | 3.3.3 | XSS sanitization |
| Supabase JS | 2.74.0 | Database, auth, storage, realtime, edge functions |
| Deno | Runtime | Edge function execution |

---

## 3. Authentication & Role System

### Signup Flow (Step by Step)

```
User selects role ("Student" or "Parent") on Auth.tsx
  -> enters name, email, password
  -> supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })
  -> role stored in raw_user_meta_data
     |
     v
TRIGGER: handle_new_user()
  INSERT INTO profiles (user_id, full_name, role)
  VALUES (NEW.id, metadata->>'full_name', COALESCE(metadata->>'role', 'student'))
     |
     v
TRIGGER: prevent_admin_self_assign()
  IF INSERT AND role = 'admin' -> downgrade to 'student'
  IF UPDATE AND role changed   -> revert to old role
```

**Admin creation**: Only via service-role SQL: `UPDATE profiles SET role = 'admin' WHERE user_id = '<uuid>';`

### Role Detection (`useUserRole` hook)

```typescript
// Queries profiles table, re-runs on auth state change
const { data } = await supabase.from("profiles").select("role").eq("user_id", session.user.id).single();
setRole(data?.role || "student");
```

### Dashboard Routing

```typescript
{role === "parent" && <ParentDashboard />}
{role === "admin" && <AdminDashboard />}
{role === "student" && <>Student pillars, news, affirmations</>}
```

**Known gap**: Pillar pages (`/finance`, `/mental-health`, etc.) have no role check. `RoleGuard.tsx` exists but is unused on those routes.

### Password Reset

1. Client: `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
2. Email sent with recovery token
3. `ResetPassword.tsx`: `supabase.auth.updateUser({ password })`

---

## 4. Data Flow

### 4.1 AI Chat (Streaming SSE) — Most Complex Flow

```
Browser                          Edge Function (ai-chat)           AI Provider
  |                                    |                               |
  |-- POST /functions/v1/ai-chat ----->|                               |
  |   Headers: Bearer <anon_key>       |                               |
  |   Body: {messages[], provider}     |                               |
  |                                    |-- Verify JWT (getClaims) ---->|
  |                                    |-- Validate input (1-100 msgs) |
  |                                    |                               |
  |                                    |-- POST to AI Gateway -------->|
  |                                    |   model: gemini-2.5-flash     |
  |                                    |   stream: true                |
  |                                    |                               |
  |<-- SSE stream (proxied) -----------|<-- SSE chunks ----------------|
  |   data: {"choices":[{"delta":      |                               |
  |          {"content":"token"}}]}    |                               |
  |   ...                              |                               |
  |   data: [DONE]                     |                               |
  |                                    |                               |
  v                                    |                               |
  Client parses SSE line-by-line       |                               |
  Extracts delta.content               |                               |
  Appends to React state (streaming)   |                               |
```

**Implementation details**:
- Full conversation history sent each request (no server-side sessions)
- `textBuffer` handles partial JSON chunks across stream reads
- Edge function proxies stream directly: `return new Response(response.body, headers)`
- File uploads encoded as base64 data URLs in multi-part content format
- Error codes: 401 (JWT), 429 (rate limit), 402 (credits exhausted)

### 4.2 Parent-Student Linking

**Student**: Profile -> Generate Link Code -> `Math.random().toString(36).substring(2,8).toUpperCase()` (e.g., "X7K2M9") -> INSERT `parent_student_links` with `status: 'pending'`

**Parent**: Enter code -> SELECT by link_code -> UPDATE `parent_id` + `status: 'active'`

**Result**: `is_linked_parent()` returns TRUE -> Parent can SELECT child's `mood_entries` and `assignments`

**Edge cases**: Duplicate code -> unique constraint catch (23505) -> fetch existing. Students can DELETE links to revoke access.

### 4.3 Mood Tracking (3-Step Wizard)

1. Select mood 0-6 (emoji scale: cry to joy)
2. Select feelings from mood-specific list (e.g., mood=0 -> 21 negative options)
3. Select impact factors from 18 fixed options
4. INSERT `mood_entries` -> client-side tip generation (rule engine, no AI call)

### 4.4 Real-Time Group Chat

1. INSERT `group_messages` (RLS: must be group member)
2. Supabase Realtime broadcasts postgres_changes
3. Subscriber callback -> full re-fetch -> N+1 profile queries -> scroll to bottom
4. Images: upload to `group-photos` -> 1-year signed URL -> stored in `image_url`

### 4.5 Note Generation (4 Formats)

| Type | Output | Post-processing |
|------|--------|-----------------|
| `bullets` | Markdown | None |
| `flashcards` | `[{question, answer}]` | Strip code blocks, validate JSON |
| `mindmap` | `{central, branches}` | Strip code blocks, validate JSON |
| `summary` | Prose | None |

---

## 5. Database Schema

### 35 Tables by Domain

**User Management**: `profiles` (role, personal info), `parent_student_links` (link_code, status)

**Academics**: `assignments`, `career_quiz_results`

**Mental Health**: `mood_entries` (mood_level int, feelings text[], impact_factors text[]), `counselor_requests`

**Social (10 tables)**: `groups`, `group_members` (role: member/admin/moderator), `group_messages` (content, image_url, is_moderated), `group_events`, `event_rsvps`, `event_availability`, `availability_polls`, `availability_responses`, `user_availability`, `trusted_peers`

**Peer Support**: `bullying_reports` (NO user_id column - anonymous!), `mentor_requests`, `relationship_questions`

**Peer Connect (7 tables)**: `peer_connect_lobby`, `peer_connect_sessions`, `peer_connect_messages`, `peer_connect_responses`, `pct_sessions`, `pct_responses`, `pct_streaks`, `pct_prompt_cache`

**Finance (5 tables)**: `transactions`, `budget_categories`, `savings_goals`, `chores`, `chore_completions`

**Fitness**: `workout_logs`, `fitness_streaks` (auto-calculated by trigger)

**Communication**: `panel_messages` (context tags: parent_encouragement, admin_alert), `announcements` (target_roles, is_pinned)

### Database Functions (7)

| Function | Type | Purpose |
|----------|------|---------|
| `handle_new_user()` | Trigger | Creates profile from auth metadata |
| `prevent_admin_self_assign()` | Trigger | Blocks admin self-promotion |
| `update_fitness_streak()` | Trigger | Auto-calculates workout streaks |
| `has_role(uuid, text)` | SECURITY DEFINER | Role check for RLS |
| `is_group_member(uuid, uuid)` | SECURITY DEFINER | Group membership check with caller verification |
| `is_linked_parent(uuid, uuid)` | SECURITY DEFINER | Parent-student link check |
| `update_updated_at_column()` | Trigger | Timestamp auto-update |

### Fitness Streak Trigger Logic

- No record: create with streak=1
- Same day: no change
- Consecutive day: streak++
- Gap >1 day: reset to 1
- Always: `longest_streak = GREATEST(new_streak, old_longest)`

---

## 6. Edge Functions (19 Total)

### Standard Pattern

Every function: CORS preflight -> JWT verify via `getClaims` -> input validation -> business logic -> response

### Inventory

| Function | Streaming? | AI Model |
|----------|-----------|----------|
| `ai-chat` | Yes (SSE) | Gemini 2.5 Flash / DeepSeek |
| `academic-resource-finder` | Yes (SSE) | Gemini 2.5 Flash |
| `generate-notes` | No | Gemini 2.5 Flash |
| `generate-quiz` | No | Gemini 2.5 Flash |
| `generate-career-insights` | No | Gemini 2.5 Flash |
| `generate-career-details` | No | Gemini 2.5 Flash |
| `interview-coach` | No | Gemini 2.5 Flash |
| `generate-mood-tips` | No | Gemini 2.5 Flash |
| `finance-insights` | No | Gemini 2.5 Flash |
| `generate-recipe` | No | Gemini 2.5 Flash |
| `generate-zodiac-wellness` | No | Gemini 2.5 Flash |
| `generate-peer-prompts` | No | Gemini 2.5 Flash |
| `generate-pct-prompts` | No | Gemini 2.5 Flash |
| `seed-pct-cache` | No | Gemini 2.5 Flash |
| `peer-connect-match` | No | Gemini 2.5 Flash |
| `generate-quiz-image` | No | Gemini 2.5 Flash |
| `mood-tts` | No | Gemini 2.5 Flash |
| `fetch-real-news` | No | N/A (News API) |
| `generate-news` | No | Gemini 2.5 Flash |

### Required Secrets

`LOVABLE_API_KEY` (all AI), `DEEPSEEK_API_KEY` (optional), `NEWS_API_KEY`, `NEWSDATA_API_KEY`

---

## 7. Frontend Component Architecture

### Routing Map (17 Routes)

`/` Index | `/auth` Auth | `/reset-password` | `/dashboard` (role-based) | `/profile` | `/messages` | `/tasks` | `/headspace-hangout` | `/mental-health` | `/academics` | `/friendships` | `/fitness` | `/career` | `/finance` | `/relationships` | `/bullying` | `/help` | `/feedback` | `*` NotFound

### Key Component Tree

```
Dashboard.tsx
  -> useUserRole()
  -> Student: NewsCarousel, PCTStats, 8 Pillar Cards, AiChatDialog
  -> Parent: ParentDashboard (link input, child moods/assignments, announcements, messages)
  -> Admin: AdminDashboard (stats, reports tabs, announcements CRUD)
```

---

## 8. Real-Time Features

| Feature | Table | Events | Filter |
|---------|-------|--------|--------|
| Group Chat | `group_messages` | * | `group_id=eq.${id}` |
| Panel Messages | `panel_messages` | INSERT | None |
| Peer Lobby | `peer_connect_lobby` | UPDATE | `id=eq.${lobbyId}` |

Lifecycle: mount -> `supabase.channel().on().subscribe()` -> callback re-fetches -> unmount -> `removeChannel()`

---

## 9. Security Model

### RLS Policy Summary

| Pattern | Expression | Tables |
|---------|-----------|--------|
| Owner only | `auth.uid() = user_id` | Most user-scoped tables |
| Group members | `is_group_member()` | group_messages, events, polls |
| Parent read-only | `is_linked_parent()` | mood_entries, assignments (SELECT) |
| Admin only | `has_role(uid, 'admin')` | bullying_reports, counselor_requests, announcements |
| Anonymous write | `true` on INSERT | bullying_reports |
| Immutable | `false` on DELETE | bullying_reports |

### Critical Security Features

- **Bullying reports**: No user_id column. INSERT open to all. SELECT/UPDATE admin only. DELETE blocked.
- **Profile visibility**: Own profile, group co-members, peer connect partners, or trusted_peers only.
- **Group join**: Must insert as `role = 'member'` (RLS blocks admin/moderator self-promotion).
- **Storage**: `group-photos` private bucket, group-member-scoped RLS, signed URLs.
- **XSS**: DOMPurify sanitization on AI markdown output. Link protocol validation.
- **Edge functions**: Manual JWT verification via `getClaims` for audit logging.

---

## 10. Cross-Role Communication

```
Student                    Parent                     Admin
  |                          |                          |
  |--generate link code----->|--enter code, link------->|
  |                          |                          |
  |<--panel_message (encour.)|                          |
  |                          |<--panel_message (alert)--|
  |                          |                          |
  |<--announcement-----------|<--announcement-----------|--publish announcement
  |                          |                          |
  |--bullying report (anon)--+------------------------->|--review & update status
  |--counselor request-------|------------------------->|--manage request
```

---

## 11. Key Decisions & Tradeoffs

1. **Single role column on profiles**: Simple, matches use case. No multi-role support.
2. **Manual JWT in edge functions**: Enables logging + custom errors. More boilerplate.
3. **Client-side chat history**: Stateless functions. Token costs grow with conversation.
4. **Full re-fetch on realtime**: Consistent. Scales poorly (N+1 profile lookups).
5. **Anonymous bullying reports**: No user_id column. No follow-up possible.
6. **Auto-confirm signups**: Low friction. No email verification.

---

## 12. Edge Cases & Failure Modes

| Scenario | Behavior |
|----------|----------|
| JWT expires | Auto-refreshed via `autoRefreshToken: true` |
| Parent views before link active | RLS blocks, empty data |
| Student revokes link | Parent queries return empty immediately |
| Admin self-assign attempt | Trigger downgrades to student |
| Group join as admin | RLS rejects (must be 'member') |
| 1000+ group messages | Hit Supabase default limit, no pagination |
| AI 429 rate limit | Toast error shown |
| AI 402 no credits | Toast error shown |
| AI returns bad JSON | Raw string returned with warning field |
| SSE stream interrupts | Partial message shown |
| WebSocket disconnects | Auto-reconnect with backoff |

---

## 13. Setup & Usage

```bash
bun install && bun run dev   # http://localhost:5173
```

**Test accounts**: Student/Parent via /auth signup. Admin: signup then SQL `UPDATE profiles SET role = 'admin' WHERE user_id = '<uuid>'`

**Test parent link**: Student Profile -> Generate Code -> Parent Dashboard -> Enter Code -> Link

---

## 14. Limitations & Technical Debt

### Critical
1. No route-level role protection on pillar pages (RoleGuard unused)
2. Group chat N+1 query (profile lookup per message)
3. No pagination on any list view

### Moderate
4. Messages always resolve to first linked child
5. Link codes never expire
6. Group photo signed URLs expire after 1 year
7. AI chat history not persisted server-side

### Minor
8. Inconsistent state management (TanStack Query vs useState)
9. TypeScript `as any` casts bypass type safety
10. No client-side AI rate limiting
11. Announcement target_roles not enforced by RLS
12. Missing logout cleanup for realtime subscriptions

---

*Generated from the Stone Path AI Hub codebase, April 2026.*
