

## Profile Dropdown Menu

Replace the current header buttons (Tasks, Logout) with a profile avatar/icon that opens a dropdown menu containing all user-related actions.

### Design

The header's right side will show:
- A clickable avatar (using the user's initials as fallback)
- Clicking it opens a dropdown menu with:
  - User name and email displayed at the top
  - "Tasks" menu item (with ListTodo icon)
  - Separator
  - "Logout" menu item (with LogOut icon)

### Technical Details

**File: `src/pages/Dashboard.tsx`**

1. Add imports for `Avatar`, `AvatarFallback`, `DropdownMenu` and related components
2. Replace the current `div` with Tasks button + Logout button with a `DropdownMenu` containing:
   - `DropdownMenuTrigger` wrapping an `Avatar` showing user initials
   - `DropdownMenuContent` with:
     - `DropdownMenuLabel` showing user name and email
     - `DropdownMenuSeparator`
     - `DropdownMenuItem` for Tasks (navigates to /tasks)
     - `DropdownMenuSeparator`
     - `DropdownMenuItem` for Logout (calls handleLogout)
3. Helper function to extract user initials from name or email

