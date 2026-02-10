

## Speed Up Headspace Hangout Prompt Loading

### Problem
Every topic selection triggers a fresh AI call (~10-20 seconds). There's no caching -- identical pillar+topic combos always regenerate from scratch.

### Solution: Database Prompt Cache

Cache AI-generated prompts in a new `pct_prompt_cache` table. Serve cached prompts instantly and only call the AI when no cache exists or when the user explicitly requests fresh prompts.

### What Changes

**1. New database table: `pct_prompt_cache`**
- Columns: `id`, `pillar`, `topic`, `prompts` (jsonb), `created_at`
- Unique constraint on `(pillar, topic)` so each combo has one cached set
- No RLS needed -- this is shared/public read data, managed by the edge function

**2. Update edge function: `generate-pct-prompts`**
- Before calling AI, check `pct_prompt_cache` for existing prompts matching the pillar+topic
- If found, return cached prompts immediately (sub-second response)
- If not found, generate via AI, save to cache, then return
- Accept an optional `fresh: true` parameter to force regeneration

**3. Update `PCTSession.tsx`**
- No major changes needed (it already calls the edge function)
- Optionally add a "Get fresh prompts" button so users can request new ones if they've seen the cached set before

### Expected Result
- First user to pick a topic: ~10-20 seconds (AI generation, same as now)
- Every subsequent user picking the same topic: under 1 second (database read)
- 32 pillar+topic combos total (8 pillars x 4 topics), so the entire cache fills quickly

### Technical Details

**New table SQL:**
```text
CREATE TABLE public.pct_prompt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT NOT NULL,
  topic TEXT NOT NULL,
  prompts JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pillar, topic)
);

-- Allow edge function to read/write via service role
ALTER TABLE public.pct_prompt_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.pct_prompt_cache FOR SELECT USING (true);
```

**Edge function changes:**
- Import Supabase client using service role key
- Query cache before AI call
- Upsert into cache after AI generation

**Files modified:**
- `supabase/functions/generate-pct-prompts/index.ts` -- add cache logic
- `src/components/PCTSession.tsx` -- add optional "refresh prompts" button
- New migration for `pct_prompt_cache` table
