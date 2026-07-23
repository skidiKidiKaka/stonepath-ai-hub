## Plan: Add `chat_messages` Table for AI Chat History

### Goal
Persist AI chat history in a new Supabase table with strict row-level security so users can only access their own messages.

### Implementation Steps

1. **Create the table** `public.chat_messages` with the requested columns:
   - `id` — UUID primary key (default `gen_random_uuid()`)
   - `user_id` — UUID, references `auth.users(id)`
   - `role` — TEXT, constrained to `'user'` or `'assistant'`
   - `content` — JSONB
   - `created_at` — TIMESTAMPTZ, default `now()`

2. **Add standard timestamps trigger** for `updated_at` (even though only `created_at` is requested, an update trigger keeps the table consistent with the rest of the schema).

3. **Grant Data API access** following the required four-step order:
   - `GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;`
   - `GRANT ALL ON public.chat_messages TO service_role;`

4. **Enable Row Level Security** on `public.chat_messages`.

5. **Create RLS policies** scoped to the authenticated owner:
   - `chat_messages_select_own` — users can read rows where `auth.uid() = user_id`
   - `chat_messages_insert_own` — users can insert rows where `auth.uid() = user_id`
   - `chat_messages_delete_own` — users can delete rows where `auth.uid() = user_id`

6. **Regenerate Supabase types** after the migration so the new table is available in the frontend types.

### Notes
- No `UPDATE` policy will be added because you only requested SELECT/INSERT/DELETE.
- The `role` column will include a `CHECK` constraint to enforce `'user'` or `'assistant'`.
- This migration does not modify any existing code; it only adds the backend table and access rules.