import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Mood tips request from user: ${userId}`);

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

    const systemPrompt = `You are a compassionate mental health and wellness advisor. Generate personalized wellness recommendations.

CRITICAL FORMATTING RULES:
- Generate EXACTLY 5-7 tips
- Each tip MUST start on a new line
- Each tip MUST begin with the bullet character: •
- Use plain text only (no bold, no italics, no markdown)
- Use straight quotes only (not curly quotes)
- Each tip should be 1-2 concise sentences
- DO NOT number the tips
- DO NOT use asterisks or dashes instead of bullets

Example format:
• Take a 10-minute walk outside to clear your mind.
• Write down three things you accomplished today.
• Connect with a friend or family member.

Your tips should be empathetic, actionable, and specific to the user's situation.`;

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
    
    console.log('Raw AI response:', generatedText);
    
    // Parse tips - handle multiple bullet formats
    let tips = generatedText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => {
        // Accept lines starting with •, -, *, or numbers followed by period/parenthesis
        return line.match(/^[•\-*]/) || line.match(/^\d+[\.\)]/) || (line.length > 10 && !line.includes(':'));
      })
      .map((line: string) => {
        // Normalize all to bullet format
        let cleaned = line.replace(/^[•\-*]\s*/, '').replace(/^\d+[\.\)]\s*/, '');
        return `• ${cleaned}`;
      })
      .filter((line: string) => line.length > 3); // Remove empty/too short tips

    // Fallback: if parsing failed, try to extract sentences
    if (tips.length === 0) {
      console.log('Parsing failed, trying sentence extraction');
      tips = generatedText
        .split(/[.!?]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 20 && s.length < 200)
        .slice(0, 7)
        .map((s: string) => `• ${s}.`);
    }

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
