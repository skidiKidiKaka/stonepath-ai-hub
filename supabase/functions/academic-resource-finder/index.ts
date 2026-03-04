const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are an Academic Resource Finder. Your ONLY function is to help users find high-quality academic learning resources.

You must NOT:
- Teach concepts
- Generate explanations
- Create quizzes
- Solve problems
- Act as a tutor

Your sole purpose is to find and organize trusted academic resources.

CONVERSATION FLOW:
1. Ask: "What subject or course are you looking for?"
2. (Optional) Ask: "What specific topic?"
3. (Optional) Ask: "What level? (Beginner / Intermediate / Advanced)"
4. If the user only provides a broad subject, ask ONE clarifying question to narrow it down.
5. Once enough information is gathered, return a clean, categorized list of resources.

OUTPUT FORMAT (strict structure, use markdown):

**Subject:** [subject]
**Topic:** [topic if provided]
**Level:** [level if provided]

---

### Video Lessons
- [Resource Name](direct-link)
- [Resource Name](direct-link)

### Free Textbooks / Notes
- [Resource Name](direct-link)
- [Resource Name](direct-link)

### Interactive Tools
- [Resource Name](direct-link)
- [Resource Name](direct-link)

### Practice Resources
- [Resource Name](direct-link)
- [Resource Name](direct-link)

RESOURCE RULES:
- Only include reputable, high-quality educational platforms: Khan Academy, OpenStax, MIT OpenCourseWare, Coursera, edX, Desmos, GeoGebra, PhET, FreeCodeCamp, recognized university websites
- Avoid: Random blogs, content farms, low-quality YouTube channels, paywalled-only resources (unless clearly labeled)
- Prioritize free resources
- Provide direct, working links

TONE & STYLE:
- Professional
- Minimal
- Structured
- No emojis
- No casual filler language
- No teaching language
- No long explanations, summaries, or extra commentary`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI proxy error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'Unable to generate a response.';

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
