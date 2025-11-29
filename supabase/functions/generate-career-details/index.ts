import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { careerPath, answers, resultType } = await req.json();
    console.log('Generating details for career path:', careerPath);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const answersText = answers.map((a: any, i: number) => 
      `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}`
    ).join('\n\n');

    const prompt = `Based on these career quiz answers and the identified personality type "${resultType}", explain why "${careerPath}" is a great match.

Quiz Answers:
${answersText}

Generate a detailed explanation covering:
1. Why this career matches their personality and answers
2. Key skills they already have that align with this career
3. Day-to-day work they'd be doing
4. Growth opportunities and career progression
5. Potential challenges and how to overcome them

Write 3-4 paragraphs that feel personal and encouraging.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are an expert career counselor. Provide detailed, personalized explanations for why specific careers match a student's personality and interests." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const details = data.choices?.[0]?.message?.content;
    
    if (!details) {
      throw new Error("No content in AI response");
    }

    console.log('Generated career details');

    return new Response(JSON.stringify({ details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-career-details:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error generating career details"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
