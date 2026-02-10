import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ======= DEMO ANSWER =======
    if (type === "demo-answer") {
      const { question, options } = body;
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
              content: `You are simulating a friendly high school student answering an icebreaker question. Pick the option that feels most natural and realistic for a teen. Return ONLY a JSON object: {"selectedOption": <index>} where index is 0-${options.length - 1}. No other text.`,
            },
            {
              role: "user",
              content: `Question: "${question}"\nOptions: ${options.map((o: string, i: number) => `${i}: "${o}"`).join(", ")}`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("AI gateway error");
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "";
      try {
        const parsed = JSON.parse(content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim());
        return new Response(JSON.stringify({ selectedOption: parsed.selectedOption ?? 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        // Fallback: pick a random option
        return new Response(JSON.stringify({ selectedOption: Math.floor(Math.random() * options.length) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ======= DEMO CHAT =======
    if (type === "demo-chat") {
      const { messages, pillar } = body;
      const recentMessages = (messages || []).slice(-10);
      const conversationContext = recentMessages
        .map((m: any) => `${m.isMe ? "User" : "Alex"}: ${m.content}`)
        .join("\n");

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
              content: `You are "Alex", a friendly, empathetic high school student chatting with a peer about ${pillar || "life"}. You just finished answering icebreaker questions together. Be natural, warm, use casual teen-friendly language (but not cringey). Keep responses to 1-3 sentences. Ask follow-up questions sometimes. Never reveal you're AI. Return just the message text, no quotes or formatting.`,
            },
            {
              role: "user",
              content: conversationContext
                ? `Here's the conversation so far:\n${conversationContext}\n\nRespond as Alex:`
                : "The chat just started. Say something friendly to kick off the conversation as Alex:",
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("AI gateway error");
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "That's really interesting! Tell me more 😊";

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ======= CONNECTION SPARK =======
    if (type === "spark") {
      const { question, optionA, optionB } = body;
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

    // ======= GENERATE MCQ PROMPTS =======
    const { pillar } = body;
    const cacheKey = `peer_${pillar}`;
    const { data: cached } = await supabase
      .from("pct_prompt_cache")
      .select("prompts")
      .eq("pillar", cacheKey)
      .eq("topic", "icebreakers")
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ prompts: cached.prompts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
