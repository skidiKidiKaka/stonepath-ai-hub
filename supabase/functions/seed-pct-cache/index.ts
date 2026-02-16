import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_COMBOS = [
  { pillar: "Mental Health", topics: ["Managing Anxiety", "Building Self-Esteem", "Dealing with Stress", "Emotional Awareness"] },
  { pillar: "Academics", topics: ["Study Motivation", "Test Anxiety", "Time Management", "Academic Pressure"] },
  { pillar: "Friendships", topics: ["Making New Friends", "Handling Conflict", "Peer Pressure", "Being a Good Friend"] },
  { pillar: "Relationships", topics: ["Healthy Boundaries", "Communication Skills", "Understanding Feelings", "Family Dynamics"] },
  { pillar: "Peer Support", topics: ["Standing Up for Others", "Cyberbullying", "Building Resilience", "Seeking Help"] },
  { pillar: "Fitness & Wellness", topics: ["Body Image", "Healthy Habits", "Sleep Hygiene", "Mindful Movement"] },
  { pillar: "Career", topics: ["Finding Your Passion", "Goal Setting", "Dealing with Uncertainty", "Exploring Interests"] },
  { pillar: "Finance", topics: ["Money Mindset", "Saving Goals", "Financial Stress", "Smart Spending"] },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`seed-pct-cache request from user: ${userId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use service role for cache writes (legitimate RLS bypass for cache management)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const group of ALL_COMBOS) {
      for (const topic of group.topics) {
        const pillar = group.pillar;

        // Check cache
        const { data: cached } = await supabase
          .from("pct_prompt_cache")
          .select("id")
          .eq("pillar", pillar)
          .eq("topic", topic)
          .maybeSingle();

        if (cached) {
          console.log(`Already cached: ${pillar}/${topic}`);
          skipped++;
          continue;
        }

        console.log(`Generating: ${pillar}/${topic}...`);

        try {
          const systemPrompt = `You are a supportive peer conversation guide for high school students, trained in CBT and DBT techniques. Generate exactly 5 guided reflection prompts for the topic "${topic}" under the pillar "${pillar}". Each prompt should:
- Be open-ended and non-judgmental
- Gradually deepen from surface-level to more introspective
- Include a brief tip (1 sentence) to help the student think about their answer
- Be appropriate for ages 14-18

Return valid JSON: {"prompts": [{"question": "...", "tip": "..."}]}`;

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Generate 5 guided reflection prompts for the topic "${topic}" in the "${pillar}" pillar.` },
              ],
            }),
          });

          if (!response.ok) {
            const t = await response.text();
            errors.push(`${pillar}/${topic}: HTTP ${response.status} - ${t}`);
            console.error(`Error for ${pillar}/${topic}:`, response.status, t);
            if (response.status === 429) await delay(10000);
            continue;
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";

          let parsed;
          try {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
            parsed = JSON.parse(jsonMatch[1].trim());
          } catch {
            parsed = JSON.parse(content);
          }

          if (parsed.prompts) {
            const { error: upsertError } = await supabase
              .from("pct_prompt_cache")
              .upsert({ pillar, topic, prompts: parsed.prompts }, { onConflict: "pillar,topic" });

            if (upsertError) {
              errors.push(`${pillar}/${topic}: upsert error - ${upsertError.message}`);
            } else {
              generated++;
              console.log(`Cached: ${pillar}/${topic}`);
            }
          }
        } catch (e) {
          errors.push(`${pillar}/${topic}: ${e instanceof Error ? e.message : "Unknown"}`);
        }

        await delay(2000);
      }
    }

    return new Response(JSON.stringify({ generated, skipped, errors, total: 32 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-pct-cache error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
