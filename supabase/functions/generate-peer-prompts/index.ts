import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const body = await req.json();
    const { type } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ======= DEMO ANSWER =======
    if (type === "demo-answer") {
      const { question, options } = body;
      if (typeof question !== 'string' || question.length > 500) {
        return new Response(JSON.stringify({ error: 'Invalid question' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!Array.isArray(options) || options.length > 10) {
        return new Response(JSON.stringify({ error: 'Invalid options' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        return new Response(JSON.stringify({ selectedOption: Math.floor(Math.random() * options.length) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ======= DEMO CHAT =======
    if (type === "demo-chat") {
      const { messages, pillar, answerSummary } = body;
      if (Array.isArray(messages) && messages.length > 50) {
        return new Response(JSON.stringify({ error: 'Too many messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const recentMessages = (messages || []).slice(-10);
      const conversationContext = recentMessages
        .map((m: any) => `${m.isMe ? "User" : "Alex"}: ${String(m.content).substring(0, 500)}`)
        .join("\n");

      let answerContext = "";
      if (answerSummary && Array.isArray(answerSummary)) {
        answerContext = "\n\nHere are your shared icebreaker answers:\n" +
          answerSummary.map((a: any) => `Q: ${a.question}\nYou: ${a.myAnswer} | Alex: ${a.partnerAnswer}`).join("\n");
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
              content: `You are "Alex", a friendly, empathetic high school student chatting with a peer about ${pillar || "life"}. You just finished answering deep icebreaker questions together and you know each other's answers. Be natural, warm, use casual teen-friendly language (but not cringey). Keep responses to 1-3 sentences. Ask follow-up questions sometimes. Reference the icebreaker answers naturally when relevant. Never reveal you're AI. Return just the message text, no quotes or formatting.${answerContext}`,
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

    // ======= AI BANTER =======
    if (type === "ai-banter") {
      const { messages, answerSummary } = body;
      if (Array.isArray(messages) && messages.length > 50) {
        return new Response(JSON.stringify({ error: 'Too many messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const recentMessages = (messages || []).slice(-6);
      const chatContext = recentMessages
        .map((m: any) => `${m.isMe ? "Person A" : "Person B"}: ${String(m.content).substring(0, 300)}`)
        .join("\n");

      let answerContext = "";
      if (answerSummary && Array.isArray(answerSummary)) {
        answerContext = "\nTheir icebreaker answers:\n" +
          answerSummary.map((a: any) => `Q: ${a.question} → A: ${a.myAnswer}, B: ${a.partnerAnswer}`).join("\n");
      }

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
              content: `You are a witty AI wingman observing two high school students chatting after answering deep icebreaker questions together. Drop a SHORT, funny, relevant one-liner comment about their conversation or their icebreaker answers. Be playful, not cringe. Max 15 words. Reference what they're talking about or their earlier answers. No quotes, no emojis except maybe one. Just the comment.`,
            },
            {
              role: "user",
              content: `Recent chat:\n${chatContext}${answerContext}\n\nDrop a witty one-liner:`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("AI gateway error");
      const data = await response.json();
      const banter = data.choices?.[0]?.message?.content?.trim() || "";

      return new Response(JSON.stringify({ banter }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ======= CONNECTION SPARK =======
    if (type === "spark") {
      const { question, optionA, optionB, depth } = body;
      if (typeof question !== 'string' || question.length > 500 ||
          typeof optionA !== 'string' || optionA.length > 500 ||
          typeof optionB !== 'string' || optionB.length > 500) {
        return new Response(JSON.stringify({ error: 'Invalid input' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const depthLabel = depth === 1 ? "surface" : depth === 2 ? "personal" : depth === 3 ? "deep" : "raw/unhinged";

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
              content: `You are a warm, supportive conversation facilitator for teens. Given a ${depthLabel}-level question and two people's answers, write a single warm sentence that highlights what they have in common or what's interesting about their different perspectives. Match the emotional depth of the question — be more profound for deeper questions. Keep it brief, positive, and encouraging. Return just the sentence, no quotes.`,
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

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400,
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
