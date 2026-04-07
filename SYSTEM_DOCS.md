# Stone Path Project — System Documentation

> **Version:** 1.0 · **Last updated:** 2026-04-07 · **Audience:** Engineers unfamiliar with the project

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Flow](#3-data-flow)
4. [APIs / Interfaces](#4-apis--interfaces)
5. [Key Decisions & Tradeoffs](#5-key-decisions--tradeoffs)
6. [Edge Cases & Failure Modes](#6-edge-cases--failure-modes)
7. [Setup & Usage](#7-setup--usage)
8. [Limitations](#8-limitations)

---

## 1. Overview

### What It Does

Stone Path Project is a comprehensive support platform for high school students. It provides tools and resources across **eight core pillars**: Mental Health, Academics, Career, Finance, Fitness, Friendships, Relationships, and Bullying Prevention (Peer Support).

The platform serves three user roles:

| Role | Purpose |
|------|---------|
| **Student** | Full access to all 8 pillars, tasks, peer features, AI chat, and Headspace Hangout |
| **Parent** | Read-only view of linked child's mood and assignments; messaging; school announcements |
| **School Admin** | Manage bullying reports, counselor/mentor requests; publish announcements |

### Why It Exists

High school students face challenges across multiple dimensions of life. Existing tools address these in isolation (a mood tracker here, a budgeting app there). Stone Path unifies them into a single platform with inter-role communication so parents and school staff can provide support without micromanaging.

---

## 2. Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 18 + Vite 5 + TypeScript + Tailwind CSS + shadcn/ui  │
│  Wrapped in Capacitor for iOS/Android                        │
└────────────────────────┬────────────────────────────────────┘
                         │ Supabase JS SDK
┌────────────────────────▼────────────────────────────────────┐
│                   Supabase (Lovable Cloud)                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐            │
│  │ Auth      │  │ PostgreSQL   │  │ Storage    │            │
│  │ (email)   │  │ + RLS        │  │ (avatars,  │            │
│  └──────────┘  └──────────────┘  │  photos)   │            │
│  ┌──────────────────────────┐    └────────────┘            │
│  │ 19 Edge Functions        │                               │
│  │ (AI chat, quiz gen,      │                               │
│  │  career insights, etc.)  │                               │
│  └──────────────────────────┘                               │
│  ┌──────────────────────────┐                               │
│  │ Realtime (WebSocket)     │                               │
│  │ (messages, peer connect) │                               │
│  └──────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │ External AI Gateway │
              │ (Lovable AI / OpenAI│
              │  / DeepSeek)        │
              └─────────────────────┘
```

### Key Components and Responsibilities

#### Frontend

| Component / File | Responsibility |
|-----------------|----------------|
| `src/App.tsx` | Route definitions. Single flat routing — no nested layouts. |
| `src/pages/Auth.tsx` | Login, signup with role selection (Student or Parent). Password reset. |
| `src/pages/Dashboard.tsx` | Role-based routing: renders `ParentDashboard`, `AdminDashboard`, or student view depending on `useUserRole()`. |
| `src/hooks/useUserRole.ts` | Hook that fetches the user's role from the `profiles` table. Returns `{ role, loading }`. |
| `src/components/RoleGuard.tsx` | Wrapper that redirects users to `/dashboard` if their role is not in `allowedRoles`. |
| `src/components/ParentDashboard.tsx` | Parent panel: link children, view child mood/assignments, messages, announcements. |
| `src/components/AdminDashboard.tsx` | Admin panel: manage bullying reports, counselor/mentor requests, publish announcements. |
| `src/pages/Messages.tsx` | Cross-role messaging between linked parent-student accounts. Uses Supabase Realtime. |
| Pillar pages (`MentalHealth`, `Academics`, `Career`, `Finance`, `Fitness`, `Friendships`, `Relationships`, `Bullying`) | Student-only feature pages, each with multiple sub-features. |
| `src/pages/HeadspaceHangout.tsx` | Guided reflection (PCT sessions) and Peer Connect (real-time peer matching). |

#### Database (36 tables)

Core tables grouped by domain:

| Domain | Tables |
|--------|--------|
| **Identity** | `profiles` (role, personal info, link to auth.users) |
| **Multi-role** | `parent_student_links`, `panel_messages`, `announcements` |
| **Mental Health** | `mood_entries`, `pct_sessions`, `pct_responses`, `pct_streaks`, `pct_prompt_cache` |
| **Academics** | `assignments` |
| **Career** | `career_quiz_results` |
| **Finance** | `budget_categories`, `transactions`, `savings_goals`, `chores`, `chore_completions` |
| **Fitness** | `workout_logs`, `fitness_streaks` |
| **Social** | `groups`, `group_members`, `group_messages`, `group_events`, `event_rsvps`, `event_availability`, `availability_polls`, `availability_responses`, `user_availability`, `trusted_peers`, `peer_connect_lobby`, `peer_connect_sessions`, `peer_connect_messages`, `peer_connect_responses` |
| **Safety** | `bullying_reports`, `counselor_requests`, `mentor_requests` |
| **Relationships** | `relationship_questions` |

#### Edge Functions (19 total)

All edge functions follow the same pattern:
1. `verify_jwt = false` in `supabase/config.toml`
2. Manual JWT validation via `supabase.auth.getClaims(token)`
3. Return `401` if unauthenticated
4. Call external AI API (Lovable AI Gateway, OpenAI, or DeepSeek)
5. Return JSON response

| Function | Purpose |
|----------|---------|
| `ai-chat` | General AI assistant chat |
| `generate-notes` | AI-powered note generation |
| `generate-mood-tips` | Mood-based wellness tips |
| `generate-pct-prompts` | Personal Contemplation Time prompts |
| `generate-peer-prompts` | Peer Connect conversation prompts |
| `generate-quiz` | Career personality quiz questions |
| `generate-quiz-image` | Quiz result images |
| `generate-career-insights` | Career exploration insights |
| `generate-career-details` | Detailed career info |
| `generate-news` | AI-generated news summaries |
| `fetch-real-news` | Fetches real news via API |
| `generate-recipe` | Nutrition/fitness recipes |
| `generate-zodiac-wellness` | Zodiac-based wellness tips |
| `interview-coach` | Mock interview practice |
| `mood-tts` | Text-to-speech for mood content |
| `peer-connect-match` | Matches peers in lobby |
| `seed-pct-cache` | Pre-generates PCT prompts |
| `academic-resource-finder` | Educational resource lookup chatbot |
| `finance-insights` | Budget/spending AI analysis |

#### Storage Buckets

| Bucket | Visibility | Purpose |
|--------|-----------|---------|
| `avatars` | Public | User profile pictures |
| `group-photos` | Private | Group media, accessed via group membership RLS |

---

## 3. Data Flow

### 3.1 User Registration & Role Assignment

```
User → Auth.tsx (selects Student or Parent)
  → supabase.auth.signUp({ data: { role: "student" } })
  → Supabase Auth creates user in auth.users
  → Trigger: handle_new_user() fires
    → INSERT INTO profiles (user_id, full_name, role)
    → Trigger: prevent_admin_self_assign() fires
      → If role = 'admin', silently downgrades to 'student'
  → Session returned → redirect to /dashboard
  → Dashboard.tsx reads role via useUserRole()
  → Renders role-specific dashboard
```

### 3.2 Parent-Student Linking

```
Student:
  Profile.tsx → generates random 6-char link code
  → INSERT INTO parent_student_links (student_id, link_code, status='pending')

Parent:
  ParentDashboard.tsx → enters link code
  → SELECT from parent_student_links WHERE link_code = input
  → UPDATE parent_student_links SET parent_id = auth.uid(), status = 'active'
  → RLS: is_linked_parent() now returns true
  → Parent can SELECT from mood_entries, assignments for that student
```

### 3.3 Cross-Role Messaging

```
Sender → Messages.tsx
  → Looks up linked accounts via parent_student_links
  → INSERT INTO panel_messages (sender_id, recipient_id, content)
  → Supabase Realtime broadcasts INSERT event
  → Recipient's Messages.tsx receives event → refetch messages
```

### 3.4 AI Feature Request (generic pattern)

```
User → Component (e.g., AiChatDialog)
  → supabase.functions.invoke("ai-chat", { body: { messages } })
  → Edge function:
    1. Validates JWT from Authorization header
    2. Validates input (presence, type, length)
    3. Calls AI Gateway (Lovable AI or OpenAI)
    4. Returns { content: "..." }
  → Component renders response
```

### 3.5 Admin Report Management

```
Student (or anonymous):
  → INSERT INTO bullying_reports (anonymous, no user_id column)
  → RLS: WITH CHECK (true) allows insert

Admin:
  → AdminDashboard.tsx fetches bullying_reports
  → RLS: has_role(auth.uid(), 'admin') grants SELECT
  → Admin updates status (pending → reviewing → resolved)
  → RLS: has_role(auth.uid(), 'admin') grants UPDATE
```

---

## 4. APIs / Interfaces

### 4.1 Edge Function API Pattern

All edge functions share this interface:

**Request:**
```
POST /functions/v1/{function-name}
Authorization: Bearer <JWT>
Content-Type: application/json

{ ...function-specific body }
```

**Response:**
```json
{ "content": "...", ...additional fields }
```

**Error responses:**
- `401` — Missing or invalid JWT
- `400` — Invalid input (missing fields, wrong types)
- `500` — AI gateway failure

### 4.2 Key Function Interfaces

#### `ai-chat`
```typescript
// Input
{ messages: Array<{ role: "user" | "assistant", content: string }> }

// Output
{ content: string }
```

#### `generate-quiz`
```typescript
// Input
{ topic?: string }

// Output
{ questions: Array<{ question: string, options: string[] }> }
```

#### `peer-connect-match`
```typescript
// Input
{ pillar: string, userId: string }

// Output
{ matched: boolean, sessionId?: string, partnerId?: string }
```

### 4.3 Database Helper Functions (RPC)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `has_role` | `(user_id uuid, role text) → boolean` | Check if user has specific role. SECURITY DEFINER. |
| `is_linked_parent` | `(parent_id uuid, student_id uuid) → boolean` | Check if parent-student link is active. SECURITY DEFINER. |
| `is_group_member` | `(group_id uuid, user_id uuid) → boolean` | Check group membership with auth check. SECURITY DEFINER. |

### 4.4 Realtime Channels

| Channel | Table | Purpose |
|---------|-------|---------|
| `panel-messages` | `panel_messages` | Cross-role direct messages |
| `peer-connect` | `peer_connect_lobby`, `peer_connect_messages` | Peer matching and chat |
| `group-chat` | `group_messages` | Group chat messages |

---

## 5. Key Decisions & Tradeoffs

### 5.1 Role Stored on Profiles Table (not a separate user_roles table)

**Decision:** Role is a single `text` column on `profiles`, not a separate many-to-many `user_roles` table.

**Why:** The app has exactly three mutually exclusive roles. A many-to-many table adds complexity without benefit. A database trigger (`prevent_admin_self_assign`) and RLS policies prevent escalation.

**Tradeoff:** If multi-role support is ever needed (e.g., a parent who is also an admin), this column must be refactored into a join table.

### 5.2 `verify_jwt = false` with Manual Validation

**Decision:** All edge functions set `verify_jwt = false` in `config.toml` and manually call `auth.getClaims()`.

**Why:** This is the recommended Lovable Cloud pattern. It allows custom error handling, user context extraction, and consistent 401 responses. Automatic JWT verification provides less control.

### 5.3 Anonymous Bullying Reports

**Decision:** The `bullying_reports` table has no `user_id` column and uses `WITH CHECK (true)` for INSERT.

**Why:** Victim safety. Requiring authentication could discourage reporting. Reports are INSERT-only (no UPDATE/DELETE for public role) and only visible to admins.

**Tradeoff:** No way to follow up with the reporter. Potential for spam submissions.

### 5.4 Public Avatars Bucket

**Decision:** The `avatars` storage bucket is public.

**Why:** Avatars are shown in multiple contexts (group chats, peer sessions, dashboards). Public access avoids signed URL overhead for every avatar render.

**Tradeoff:** Avatar images are accessible to anyone with the URL, even unauthenticated users.

### 5.5 Capacitor Wrapping for Mobile

**Decision:** The web app is wrapped with Capacitor to run on iOS (Xcode) and Android Studio.

**Why:** Single codebase for web and mobile. Safe area insets are handled via `env(safe-area-inset-*)` CSS.

**Tradeoff:** No access to native UI components. Performance is limited to WebView capabilities.

---

## 6. Edge Cases & Failure Modes

### Authentication

| Scenario | Handling |
|----------|----------|
| JWT expires during use | `supabase.auth.onAuthStateChange` detects session loss → redirects to `/auth` |
| User signs up with `admin` role via API manipulation | `handle_new_user` trigger passes role to profiles → `prevent_admin_self_assign` trigger downgrades to `student` |
| User tries to UPDATE their own role | RLS `WITH CHECK` + trigger both block the change |

### Parent-Student Linking

| Scenario | Handling |
|----------|----------|
| Invalid link code entered | Query returns no rows → "Invalid link code" error toast |
| Link already active | Checked before update → "Already active" info toast |
| Parent tries to link without parent role | RLS: `has_role(auth.uid(), 'parent')` blocks INSERT |
| Student deletes link | RLS allows: `auth.uid() = student_id` on DELETE |

### AI Features

| Scenario | Handling |
|----------|----------|
| AI gateway returns error | Edge function catches → returns generic error → frontend shows "An error occurred" |
| AI returns malicious HTML | `AcademicResourceFinder` escapes HTML entities before regex, validates URLs (https only), and sanitizes output with DOMPurify |
| Rate limiting | Not implemented at app level — relies on Supabase function invocation limits |

### Data Access

| Scenario | Handling |
|----------|----------|
| User tries to read another user's mood entries | RLS: `auth.uid() = user_id` blocks. Parents get access only via `is_linked_parent()` |
| Non-member tries to read group messages | RLS: EXISTS check on `group_members` blocks access |
| Query exceeds 1000-row Supabase default limit | Most queries use `.limit()`. Pagination not implemented for all views. |

### Realtime

| Scenario | Handling |
|----------|----------|
| User subscribes to someone else's message channel | RLS on `realtime.messages` restricts based on auth. Table-level RLS on `panel_messages` also enforces `sender_id OR recipient_id = auth.uid()` |
| WebSocket disconnects | Supabase client auto-reconnects. UI fetches on reconnect via `onAuthStateChange`. |

---

## 7. Setup & Usage

### Prerequisites

- **Node.js** 18+ and **Bun** (package manager)
- **Lovable Cloud** project (provides Supabase backend automatically)
- For mobile: **Xcode** (iOS) or **Android Studio** (Android) with **Capacitor**

### Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
# → http://localhost:5173
```

### Environment Variables

Automatically managed by Lovable Cloud. The `.env` file is auto-generated:

```
VITE_SUPABASE_URL=https://nxaztzpuqdivemdemvga.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=nxaztzpuqdivemdemvga
```

**Do not edit `.env` manually.**

### Edge Function Secrets

Configured via Lovable Cloud secrets management:

| Secret | Purpose |
|--------|---------|
| `LOVABLE_API_KEY` | Lovable AI Gateway access |
| `OPENAI_API_KEY` | OpenAI API fallback |
| `DEEPSEEK_API_KEY` | DeepSeek API |
| `NEWSDATA_API_KEY` | News data provider |
| `NEWS_API_KEY` | Secondary news API |

### Database Migrations

All migrations are in `supabase/migrations/` and auto-applied. To add a new migration, use the Lovable migration tool (do not create files manually).

### Project Structure

```
├── src/
│   ├── App.tsx                  # Route definitions
│   ├── pages/                   # Page-level components (one per route)
│   ├── components/              # Shared and feature components
│   │   └── ui/                  # shadcn/ui primitives
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/supabase/   # Auto-generated client + types
│   └── data/                    # Static data files
├── supabase/
│   ├── config.toml              # Edge function config
│   ├── functions/               # 19 Deno edge functions
│   └── migrations/              # SQL migrations (read-only)
├── public/                      # Static assets
└── index.html                   # Entry point
```

### Creating an Admin User

Admin role cannot be self-assigned. To promote a user to admin:

1. Use the Lovable Cloud backend interface
2. Run a service-role query:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE user_id = '<user-uuid>';
   ```
   (The `prevent_admin_self_assign` trigger only blocks non-superuser contexts.)

---

## 8. Limitations

### Known Constraints

1. **No route-level role protection.** All pillar routes (e.g., `/mental-health`, `/finance`) are accessible by any authenticated user. `RoleGuard` exists but is not applied to all routes. RLS prevents unauthorized data access at the database level, but the UI is still visible.

2. **Single-role model.** Users can only have one role. A parent who is also a school admin cannot hold both roles simultaneously.

3. **No pagination for large datasets.** Messages, announcements, and reports use `.limit()` but lack true pagination with cursors or offset.

4. **No push notifications.** The `Notifications` menu item shows "coming soon." Mobile push notifications via Capacitor are not implemented.

5. **Message recipient lookup is limited.** The Messages page sends to the first linked account found. There is no user search or address book.

6. **No email notifications.** Status changes on bullying reports, counselor requests, or mentor requests are not emailed to the submitter.

7. **No rate limiting on edge functions.** While Supabase has infrastructure-level limits, there is no per-user rate limiting on AI chat or other expensive operations.

8. **Peer Connect requires live users.** The matching system only works with simultaneously online users. There is a test mode with an AI mock user, but real matching is not functional until sufficient user base exists.

9. **Announcement filtering.** Announcements are stored with a `school` column but filtering by the viewer's school is not enforced — all announcements are visible to all authenticated users.

10. **No audit logging.** Admin actions (status changes, announcement deletions) are not logged to an audit trail.

### Technical Debt

- `Messages.tsx` has duplicated parent-link lookup logic (lines 92–126)
- `AdminDashboard.tsx` uses `any` type for announcements state
- The `profiles` table stores `role` directly instead of using a separate `user_roles` table (acceptable for current use case but limits future flexibility)
- Some components use hardcoded color classes instead of design tokens (flagged by linter)
