import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { moodLevel, feelings, impacts } = await req.json();
    
    console.log('Generating tips for:', { moodLevel, feelings, impacts });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const moodLabels = [
      "Very Unpleasant",
      "Unpleasant", 
      "Slightly Unpleasant",
      "Neutral",
      "Slightly Pleasant",
      "Pleasant",
      "Very Pleasant"
    ];

    const systemPrompt = `You are a compassionate mental health and wellness advisor. Generate personalized wellness recommendations based on the user's current emotional state.

Guidelines:
- Provide 5-7 actionable, specific tips
- Each tip should be 1-2 sentences maximum
- Start each tip with a bullet point (•)
- Be empathetic and supportive
- Tailor advice to their specific feelings and impact factors
- Include a mix of immediate actions and longer-term strategies
- Keep language clear, warm, and encouraging
- Make tips practical and achievable`;

    const userPrompt = `A user has checked in with their mental health status:

Mood Level: ${moodLabels[moodLevel]} (${moodLevel}/6)
Current Feelings: ${feelings.join(', ')}
Impact Factors: ${impacts.join(', ')}

Please provide personalized wellness recommendations that address their specific emotional state and circumstances.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service unavailable. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI generation failed');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    // Parse the tips from the response
    const tips = generatedText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))
      .map((line: string) => line.replace(/^[•\-*]\s*/, '• '));

    console.log('Generated tips:', tips);

    return new Response(
      JSON.stringify({ tips }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating tips:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate personalized tips';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
