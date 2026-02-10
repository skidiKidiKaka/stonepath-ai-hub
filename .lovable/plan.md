

## Pre-load All PCT Prompts So Users Never Wait

### Problem
Right now, only 1 out of 32 pillar+topic combos is cached. The first user to pick any uncached topic still waits 10-20 seconds.

### Solution
Create a new edge function `seed-pct-cache` that generates and caches prompts for all 32 combos in one go. You (as the admin) trigger it once, and after that every user gets instant results.

### What Changes

**1. New edge function: `seed-pct-cache`**
- Accepts a simple POST request (no body needed)
- Loops through all 32 pillar+topic combinations
- For each combo, checks if it already exists in `pct_prompt_cache`
- If not, calls the AI to generate prompts and saves them to the cache
- Processes sequentially to avoid rate limits (with a small delay between calls)
- Returns a summary of how many were generated vs. already cached

**2. One-time invocation**
- After deploying, we call the function once to fill the cache
- Takes ~5-10 minutes total (32 combos x ~10s each, minus any already cached)
- After that, every topic loads instantly for all users

**3. No UI changes needed**
- The existing flow already reads from the cache -- this just ensures the cache is fully populated
- The "refresh" button in PCTSession still works for users who want fresh prompts

### Technical Details

**New file:** `supabase/functions/seed-pct-cache/index.ts`
- Hardcodes the same 32 pillar+topic combos from HeadspaceHangout.tsx
- Uses the Supabase service role client to read/write `pct_prompt_cache`
- Calls the Lovable AI gateway for each uncached combo
- Adds a 2-second delay between AI calls to avoid rate limiting
- Protected by checking for a valid authorization header

**Config update:** `supabase/config.toml`
- Add `[functions.seed-pct-cache]` with `verify_jwt = false`

**Execution:** After deployment, we invoke it once via the edge function curl tool to populate all 32 entries.

