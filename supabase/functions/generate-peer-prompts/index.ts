import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pillar, type, optionA, optionB, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate "Connection Spark" comment
    if (type === "spark") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a warm, supportive conversation facilitator for teens. Given a question and two people's answers, write a single warm sentence that highlights what they have in common or what's interesting about their different perspectives. Keep it brief, positive, and encouraging. Return just the sentence, no quotes.`,
            },
            {
              role: "user",
              content: `Question: "${question}"\nPerson A chose: "${optionA}"\nPerson B chose: "${optionB}"`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("AI gateway error");
      const data = await response.json();
      const spark = data.choices?.[0]?.message?.content?.trim() || "You both bring unique perspectives!";

      return new Response(JSON.stringify({ spark }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate MCQ prompts - check cache first
    const cacheKey = `peer_${pillar}`;
    const { data: cached } = await supabase
      .from("pct_prompt_cache")
      .select("prompts")
      .eq("pillar", cacheKey)
      .eq("topic", "icebreakers")
      .maybeSingle();

    if (cached) {
      console.log(`Cache hit for peer prompts: ${pillar}`);
      return new Response(JSON.stringify({ prompts: cached.prompts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating peer prompts for ${pillar}...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a creative icebreaker designer for high school students. Generate exactly 5 personality/preference MCQ questions related to "${pillar}". These are NOT knowledge questions — they are personal preference questions with no right or wrong answer. Each question should have exactly 4 options.

The questions should:
- Be fun, relatable, and age-appropriate (14-18)
- Help two strangers discover shared perspectives
- Range from lighthearted to mildly introspective
- Feel like a personality quiz, not a test

Return valid JSON only: {"prompts": [{"question": "...", "options": ["...", "...", "...", "..."]}]}`,
          },
          {
            role: "user",
            content: `Generate 5 icebreaker MCQ questions for the "${pillar}" pillar.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
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

    // Cache for future use
    if (parsed.prompts) {
      await supabase.from("pct_prompt_cache").upsert(
        { pillar: cacheKey, topic: "icebreakers", prompts: parsed.prompts },
        { onConflict: "pillar,topic" }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-peer-prompts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
