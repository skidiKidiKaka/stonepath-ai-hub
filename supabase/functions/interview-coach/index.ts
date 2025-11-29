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
      systemPrompt = `You are an experienced interview coach helping a student prepare for job interviews${careerPath ? ` in ${careerPath}` : ''}. 

Your role:
- Ask ONE relevant interview question at a time
- Wait for the student's answer
- Provide constructive, encouraging feedback on their responses
- Offer specific tips to improve their answers
- Ask follow-up questions when appropriate
- Keep responses concise and actionable (2-3 paragraphs max)

Interview question types to rotate through:
1. Behavioral questions (Tell me about a time when...)
2. Technical/Skills questions (specific to their field)
3. Situational questions (What would you do if...)
4. Company/Role fit questions

Be supportive, professional, and focus on building confidence.`;
    } else {
      systemPrompt = `You are a friendly, expert interview coach helping students prepare for job interviews${careerPath ? ` in ${careerPath}` : ''}.

Provide guidance on:
- Common interview questions and how to answer them
- Body language and presentation tips
- STAR method for behavioral questions
- How to research companies
- What questions to ask interviewers
- Handling difficult questions
- Building confidence

Keep responses practical, encouraging, and concise (2-3 paragraphs). Use examples when helpful.`;
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
