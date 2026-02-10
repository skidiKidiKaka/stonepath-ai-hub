import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_PEER_UUID = "00000000-0000-0000-0000-000000000001";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { pillar, demo } = await req.json();
    if (!pillar) throw new Error("Pillar is required");

    const supabase = createClient(supabaseUrl, serviceKey);

    // ======= DEMO MODE =======
    if (demo) {
      console.log("Demo mode: creating session with AI peer");

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let prompts = [];

      // Try cache first
      const { data: cached } = await supabase
        .from("pct_prompt_cache")
        .select("prompts")
        .eq("pillar", `peer_${pillar}`)
        .eq("topic", "icebreakers")
        .maybeSingle();

      if (cached) {
        prompts = cached.prompts;
      } else if (LOVABLE_API_KEY) {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `Generate exactly 3 personality/preference MCQ questions related to "${pillar}" for high school students. No right/wrong answers. Each has 4 options. Return JSON only: {"prompts": [{"question": "...", "options": ["...", "...", "...", "..."]}]}`,
              },
              { role: "user", content: `Generate 3 icebreaker MCQs for "${pillar}".` },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          try {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
            const parsed = JSON.parse(jsonMatch[1].trim());
            prompts = parsed.prompts || [];
            await supabase.from("pct_prompt_cache").upsert(
              { pillar: `peer_${pillar}`, topic: "icebreakers", prompts },
              { onConflict: "pillar,topic" }
            );
          } catch {
            console.error("Failed to parse AI response for demo");
          }
        }
      }

      // Fallback prompts
      if (!prompts || prompts.length === 0) {
        prompts = [
          { question: "When you're stressed, you usually...", options: ["Listen to music", "Talk to someone", "Go for a walk", "Write it down"] },
          { question: "Your ideal weekend looks like...", options: ["Hanging with friends", "Solo adventure", "Staying in & relaxing", "Trying something new"] },
          { question: "The best way to cheer someone up is...", options: ["Make them laugh", "Listen to them", "Do something fun together", "Give them space"] },
        ];
      }

      // Create session with demo peer
      const { data: session, error: sessionError } = await supabase
        .from("peer_connect_sessions")
        .insert({
          user_a: user.id,
          user_b: DEMO_PEER_UUID,
          pillar,
          prompts,
          status: "active",
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      return new Response(
        JSON.stringify({
          status: "matched",
          sessionId: session.id,
          prompts,
          partnerId: DEMO_PEER_UUID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ======= NORMAL MODE =======
    // Look for a waiting user on the same pillar (not self)
    const { data: waiting } = await supabase
      .from("peer_connect_lobby")
      .select("*")
      .eq("pillar", pillar)
      .eq("status", "waiting")
      .neq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!waiting) {
      await supabase
        .from("peer_connect_lobby")
        .delete()
        .eq("user_id", user.id)
        .eq("status", "waiting");

      const { data: lobbyEntry, error: lobbyError } = await supabase
        .from("peer_connect_lobby")
        .insert({ user_id: user.id, pillar, status: "waiting" })
        .select("id")
        .single();

      if (lobbyError) throw lobbyError;

      return new Response(JSON.stringify({ status: "waiting", lobbyId: lobbyEntry.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match found! Generate prompts
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let prompts = [];

    const { data: cached } = await supabase
      .from("pct_prompt_cache")
      .select("prompts")
      .eq("pillar", `peer_${pillar}`)
      .eq("topic", "icebreakers")
      .maybeSingle();

    if (cached) {
      prompts = cached.prompts;
    } else if (LOVABLE_API_KEY) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `Generate exactly 3 personality/preference MCQ questions related to "${pillar}" for high school students. No right/wrong answers. Each has 4 options. Return JSON only: {"prompts": [{"question": "...", "options": ["...", "...", "...", "..."]}]}`,
              },
              { role: "user", content: `Generate 3 icebreaker MCQs for "${pillar}".` },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
          const parsed = JSON.parse(jsonMatch[1].trim());
          prompts = parsed.prompts || [];
          await supabase.from("pct_prompt_cache").upsert(
            { pillar: `peer_${pillar}`, topic: "icebreakers", prompts },
            { onConflict: "pillar,topic" }
          );
        } catch {
          console.error("Failed to parse AI response");
        }
      }
    }

    if (!prompts || prompts.length === 0) {
      prompts = [
        { question: "When you're stressed, you usually...", options: ["Listen to music", "Talk to someone", "Go for a walk", "Write it down"] },
        { question: "Your ideal weekend looks like...", options: ["Hanging with friends", "Solo adventure", "Staying in & relaxing", "Trying something new"] },
        { question: "The best way to cheer someone up is...", options: ["Make them laugh", "Listen to them", "Do something fun together", "Give them space"] },
      ];
    }

    const { data: session, error: sessionError } = await supabase
      .from("peer_connect_sessions")
      .insert({
        user_a: waiting.user_id,
        user_b: user.id,
        pillar,
        prompts,
        status: "active",
      })
      .select("id")
      .single();

    if (sessionError) throw sessionError;

    await supabase
      .from("peer_connect_lobby")
      .update({ status: "matched", matched_with: user.id, session_id: session.id })
      .eq("id", waiting.id);

    await supabase
      .from("peer_connect_lobby")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "waiting");

    await supabase
      .from("peer_connect_lobby")
      .insert({
        user_id: user.id,
        pillar,
        status: "matched",
        matched_with: waiting.user_id,
        session_id: session.id,
      });

    return new Response(
      JSON.stringify({
        status: "matched",
        sessionId: session.id,
        prompts,
        partnerId: waiting.user_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("peer-connect-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
