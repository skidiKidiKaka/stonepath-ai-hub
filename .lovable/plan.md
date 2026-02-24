

## Enhanced Profile Menu with Settings & Editable Profile

### Overview
Expand the profile dropdown into a rich menu with more options, and create a dedicated Profile/Settings page where users can edit their information. Also wire up dark/light mode toggle using `next-themes` (already installed).

### Changes

#### 1. Wire up Dark Mode (ThemeProvider)

**File: `src/App.tsx`**
- Wrap the app with `ThemeProvider` from `next-themes` (already installed as a dependency)
- Set `attribute="class"`, `defaultTheme="system"`, `enableSystem`

#### 2. Expand the Profile Dropdown Menu

**File: `src/pages/Dashboard.tsx`**
Add these items to the dropdown (grouped with separators):

- **User info section** (existing) - name + email
- **Profile & Settings group:**
  - "Edit Profile" (User icon) - navigates to `/profile`
  - "Tasks" (ListTodo icon) - existing, navigates to `/tasks`
- **Preferences group:**
  - "Dark Mode" toggle (Moon/Sun icon) - inline theme toggle using `useTheme()` from next-themes
  - "Notifications" (Bell icon) - placeholder for future, shows toast "Coming soon"
- **Support group:**
  - "Help & Support" (HelpCircle icon) - navigates to `/bullying` (peer support page)
  - "Feedback" (MessageSquare icon) - placeholder, shows toast
- **Logout** (existing)

#### 3. Create a Profile Settings Page

**New file: `src/pages/Profile.tsx`**

A full-page profile editor with sections:

- **Profile Picture**: Upload avatar image to a new `avatars` storage bucket, display current avatar or initials fallback
- **Personal Info**: Editable full name (updates `auth.user_metadata` via `supabase.auth.updateUser()` and the `profiles` table)
- **Email Display**: Show email (read-only, since changing email requires verification flow)
- **Password Change**: "Update Password" form using `supabase.auth.updateUser({ password })`
- **Theme Preference**: Light/Dark/System toggle using `next-themes`
- **Back to Dashboard** button

#### 4. Add Route

**File: `src/App.tsx`**
- Add `<Route path="/profile" element={<Profile />} />`

#### 5. Database: Create Avatars Storage Bucket

SQL migration to:
- Create an `avatars` storage bucket (public, so avatar URLs work everywhere)
- Add RLS policies: authenticated users can upload to their own folder, anyone can view (public bucket)

#### 6. Update Profiles Table

- Add `avatar_url` column to the `profiles` table so we can store the avatar path

#### 7. Update Dashboard Avatar

Update the `Avatar` component in the Dashboard header to show the user's uploaded profile picture (via `AvatarImage`) if available, falling back to initials.

### Technical Details

- **Theme toggle**: Uses `next-themes` `useTheme()` hook. The `.dark` class CSS variables are already defined in `index.css`
- **Avatar upload**: Uses Supabase storage with path `{user_id}/avatar.png`. Public bucket so the URL can be used as an `<img>` src
- **Profile updates**: `supabase.auth.updateUser({ data: { full_name } })` for auth metadata + update `profiles` table
- **Password change**: `supabase.auth.updateUser({ password: newPassword })` with confirmation field validation

