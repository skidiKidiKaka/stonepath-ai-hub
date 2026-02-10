import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pillar, topic, type, responses, fresh } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // For prompt generation (not summary), check cache first
    if (type !== "summary" && !fresh) {
      const { data: cached } = await supabase
        .from("pct_prompt_cache")
        .select("prompts")
        .eq("pillar", pillar)
        .eq("topic", topic)
        .maybeSingle();

      if (cached) {
        console.log(`Cache hit for ${pillar}/${topic}`);
        return new Response(JSON.stringify({ prompts: cached.prompts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`Cache miss for ${pillar}/${topic}, generating...`);
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "summary") {
      systemPrompt = `You are a supportive, empathetic counselor for high school students. You just guided a student through a reflection session on "${topic}" (pillar: ${pillar}). Based on their responses, provide a warm, encouraging summary (3-4 sentences) and 3 specific, actionable takeaways they can try this week. Keep language age-appropriate and hopeful. Return valid JSON: {"summary": "...", "takeaways": ["...", "...", "..."]}`;
      userPrompt = `Here are the student's reflections:\n${responses.map((r: any, i: number) => `Q${i + 1}: ${r.prompt}\nA: ${r.response}`).join("\n\n")}`;
    } else {
      systemPrompt = `You are a supportive peer conversation guide for high school students, trained in CBT and DBT techniques. Generate exactly 5 guided reflection prompts for the topic "${topic}" under the pillar "${pillar}". Each prompt should:
- Be open-ended and non-judgmental
- Gradually deepen from surface-level to more introspective
- Include a brief tip (1 sentence) to help the student think about their answer
- Be appropriate for ages 14-18

Return valid JSON: {"prompts": [{"question": "...", "tip": "..."}]}`;
      userPrompt = `Generate 5 guided reflection prompts for the topic "${topic}" in the "${pillar}" pillar.`;
    }

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    // Cache prompts (not summaries) for future use
    if (type !== "summary" && parsed.prompts) {
      const { error: upsertError } = await supabase
        .from("pct_prompt_cache")
        .upsert(
          { pillar, topic, prompts: parsed.prompts },
          { onConflict: "pillar,topic" }
        );
      if (upsertError) {
        console.error("Cache upsert error:", upsertError);
      } else {
        console.log(`Cached prompts for ${pillar}/${topic}`);
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pct-prompts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
