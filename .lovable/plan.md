

## Multi-Role Panel System with Inter-Panel Communication

### The Communication Problem

The previous plan defined three isolated panels. The user wants them interconnected. Here's how data flows between panels:

```text
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   STUDENT    │────────▶│   PARENT     │────────▶│  SCHOOL ADMIN│
│              │◀────────│              │◀────────│              │
└──────────────┘         └──────────────┘         └──────────────┘

Student ↔ Parent:
  - Parent sees child's mood entries, assignments, activity
  - Parent can send encouragement messages to child
  - Child sees parent's messages in their dashboard

Student ↔ Admin:
  - Student submits bullying reports, counselor/mentor requests
  - Admin reviews and updates status → student sees status changes
  - Admin posts announcements → students see them

Parent ↔ Admin:
  - Parent views school announcements from admin
  - Parent can message admin about concerns (re: their child)
  - Admin can flag issues to parent (attendance, mood alerts)
```

### Database Changes

**1. Add `role` to profiles table**
```sql
ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'student';
```

**2. Update `handle_new_user()` trigger** to save role from signup metadata.

**3. Create `parent_student_links` table**
Links parent accounts to student accounts. Parents can only see data for linked students.
```sql
CREATE TABLE parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending/active/rejected
  link_code text UNIQUE,  -- student generates code, parent enters it
  created_at timestamptz DEFAULT now()
);
```
- Student generates a unique link code from their profile
- Parent enters code to request link
- Student confirms to activate

**4. Create `announcements` table**
Admin posts announcements visible to students and parents.
```sql
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  school text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_roles text[] DEFAULT '{student,parent}',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**5. Create `messages` table for cross-role messaging**
```sql
CREATE TABLE panel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  subject text,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  context text,  -- 'parent_encouragement', 'admin_alert', 'parent_concern'
  created_at timestamptz DEFAULT now()
);
```

**6. Update RLS policies**
- `bullying_reports`: Admin (role='admin') can SELECT and UPDATE status
- `counselor_requests`: Admin can SELECT and UPDATE status
- `mentor_requests`: Admin can SELECT and UPDATE status
- `mood_entries`: Parents can SELECT for linked students
- `assignments`: Parents can SELECT for linked students
- `announcements`: Admin can INSERT/UPDATE/DELETE; students/parents can SELECT (filtered by school + target_roles)
- `panel_messages`: Users can SELECT/INSERT their own sent/received messages
- `parent_student_links`: Both parent and student can see their own links

**7. Create `has_role` security definer function**
```sql
CREATE FUNCTION has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = _user_id AND role = _role
  )
$$;
```

**8. Create `is_linked_parent` security definer function**
```sql
CREATE FUNCTION is_linked_parent(_parent_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_student_links
    WHERE parent_id = _parent_id AND student_id = _student_id AND status = 'active'
  )
$$;
```

### Auth Changes

- **Signup form**: Add role selector (Student / Parent / School Admin) with icons
- Pass `role` in `user_metadata`, trigger saves to profiles

### Frontend Components

**Shared:**
- `useUserRole` hook — fetches role from profiles
- `RoleGuard` component — protects routes by role

**Student Panel (existing, minor additions):**
- Add "Link Code" generator in Profile (for parent linking)
- Add "Announcements" section on dashboard (from admin)
- Add "Messages from Parent" notification indicator
- Bullying report / counselor / mentor request status tracking (see admin updates)

**Parent Panel (new):**
- `ParentDashboard.tsx` — overview of linked children
- `ChildLinking.tsx` — enter link code to connect to child
- `ChildMoodOverview.tsx` — read-only view of child's mood_entries
- `ChildActivitySummary.tsx` — read-only assignments, streaks
- `ParentMessages.tsx` — send encouragement to child, message admin
- Announcements viewer (filtered by school)

**Admin Panel (new):**
- `AdminDashboard.tsx` — stats overview
- `BullyingReportsManager.tsx` — view/update bullying_reports status
- `CounselorRequestsManager.tsx` — view/update counselor_requests
- `MentorRequestsManager.tsx` — view/update mentor_requests
- `AnnouncementManager.tsx` — create/edit/delete announcements
- `StudentOverview.tsx` — aggregated stats (user count, mood trends by school)
- `AdminMessages.tsx` — communicate with parents about concerns

### Routing

```text
/dashboard          → role-based: StudentDashboard | ParentDashboard | AdminDashboard
/profile            → shared (all roles)
/help, /feedback    → shared
/link-child         → parent only
/admin/reports      → admin only
/admin/requests     → admin only
/admin/announcements→ admin only
/admin/students     → admin only
All pillar routes   → student only
```

### Inter-Panel Communication Flows

1. **Student submits bullying report** → stored in DB → Admin sees it in real-time (realtime subscription) → Admin updates status → Student sees updated status
2. **Parent links to student** → Student generates code → Parent enters code → Link activated → Parent can now view child's mood/assignments
3. **Admin posts announcement** → Filtered by school + target_roles → Students and parents see it on their dashboards
4. **Parent sends encouragement** → Stored in panel_messages → Student sees notification on dashboard
5. **Admin flags concern to parent** → Stored in panel_messages with context → Parent sees alert

### Build Order

1. Database migration (role column, new tables, RLS, helper functions)
2. Update signup with role selection + trigger
3. `useUserRole` hook + role-based dashboard routing
4. Student link code generation + parent linking flow
5. Parent dashboard with child data views
6. Admin dashboard with report/request management
7. Cross-role messaging
8. Announcements system
9. Real-time notifications for cross-panel updates

