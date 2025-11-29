import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userMessage, mode, careerPath } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    if (mode === "practice") {
      systemPrompt = `You are an experienced interview coach helping a student prepare for job interviews${careerPath ? ` for a ${careerPath} position` : ''}. 

Your role:
- For the FIRST message, greet them warmly and ask ONE relevant opening question (like "Tell me about yourself" or "Why are you interested in this role?")
- For subsequent messages, provide constructive feedback on their answer, then ask the NEXT question
- Provide specific, actionable tips to improve their responses
- Mix different question types: behavioral, technical, situational, and role-fit questions
- Keep feedback encouraging but honest (2-3 paragraphs max per response)
- After 3-4 questions, offer a summary of their performance and areas to improve

Be supportive, professional, and focus on building confidence while being constructive.`;
    } else {
      systemPrompt = `You are an enthusiastic, expert interview coach providing comprehensive guidance to students preparing for job interviews${careerPath ? ` in ${careerPath}` : ''}.

Your role:
- Provide thorough, detailed guidance on the topic they ask about
- Use clear structure with headings, bullet points, and examples
- Be encouraging and motivating while being practical
- Include specific actionable tips and real-world examples
- Make the information engaging and easy to understand
- For topics like "common interview questions", provide 5-7 key questions with example answers
- For topics like "STAR method", explain the framework with concrete examples
- For topics like "body language", give specific do's and don'ts

Keep responses comprehensive (3-5 paragraphs) but well-organized. Make it fun and encouraging!`;
    }

    console.log("Interview coaching request - Mode:", mode, "Career:", careerPath);

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
            content: systemPrompt
          },
          ...messages,
          {
            role: "user",
            content: userMessage
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate response");
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;
    
    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in interview-coach function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
