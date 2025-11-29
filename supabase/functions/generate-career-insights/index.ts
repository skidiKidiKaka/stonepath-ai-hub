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
    const { answers } = await req.json();
    console.log('Generating career insights for answers:', answers);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const answersText = answers.map((a: any, i: number) => 
      `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}`
    ).join('\n\n');

    const prompt = `Based on these career personality quiz answers, generate a personalized career assessment:

${answersText}

Generate a JSON response with:
1. A personality type (creative, concise label like "Strategic Innovator", "Practical Problem-Solver", "Social Architect")
2. SHORT feedback (2-3 sentences max, casual and lighthearted with witty remarks or humor - make it FUN and RELATABLE!)
3. 5-6 personality traits/adjectives that describe them (single words like "Analytical", "Creative", "Empathetic", "Adaptable", etc.)
4. 6-8 key strengths with scores out of 10 - be specific and varied (e.g., "Creativity": 9, "Logic": 7, "Teamwork": 8, "Leadership": 6, "Communication": 8, "Adaptability": 7, "Problem-Solving": 9, "Organization": 5)
5. 5-6 recommended career paths that match their personality
6. 5-6 school clubs they should join (common clubs like Debate Club, Student Government, Drama Club, Science Club, etc.)
7. A short inspiring quote that resonates with their type

IMPORTANT: Make the strengths diverse and specific - include things like: Creativity, Logic, Teamwork, Leadership, Communication, Adaptability, Problem-Solving, Organization, Empathy, Innovation, Analytical Thinking, etc. Score them realistically based on their answers.

Return ONLY valid JSON in this exact format:
{
  "resultType": "string",
  "feedback": "string",
  "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "strengths": { "strengthName1": number, "strengthName2": number, "strengthName3": number, "strengthName4": number, "strengthName5": number, "strengthName6": number, "strengthName7": number, "strengthName8": number },
  "recommendedCareers": ["career1", "career2", "career3", "career4", "career5"],
  "recommendedClubs": ["club1", "club2", "club3", "club4", "club5"],
  "quote": "string"
}`;

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
            content: "You are an expert career counselor. Generate personalized, insightful career assessments based on quiz responses. Be specific, encouraging, and actionable." 
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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanContent);

    console.log('Generated career insights:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-career-insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error generating career insights"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
