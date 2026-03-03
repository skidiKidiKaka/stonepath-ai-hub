

## Problem

The landing page (`Index.tsx`) uses a stale `localStorage.getItem("user")` check to redirect to `/dashboard`. This is leftover from before Supabase auth was added. It can cause redirect loops or blank screens when localStorage has stale data but no valid Supabase session exists.

## Plan

### 1. Fix Index.tsx auth check
Replace the `localStorage.getItem("user")` check with a proper `supabase.auth.getSession()` call, consistent with how `Auth.tsx` and `Profile.tsx` handle session checks. If a valid session exists, redirect to `/dashboard`; otherwise, show the landing page.

### 2. Add a sign-out mechanism
Add a "Sign Out" button/option accessible from the Dashboard (e.g., in the top-right user menu) that calls `supabase.auth.signOut()` and also clears any stale localStorage entries, then redirects to `/`.

### Files to modify
- `src/pages/Index.tsx` — Replace localStorage check with `supabase.auth.getSession()`
- `src/pages/Dashboard.tsx` — Ensure there's a visible sign-out option that calls `supabase.auth.signOut()`

