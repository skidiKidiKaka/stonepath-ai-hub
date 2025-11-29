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
    const { zodiacSign, moodLevel, feelings, impacts } = await req.json();
    
    console.log('Generating zodiac wellness for:', { zodiacSign, moodLevel, feelings, impacts });

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

    const zodiacEmojis: { [key: string]: string } = {
      aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
      leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
      sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓"
    };

    const systemPrompt = `You are an empathetic astrology and wellness advisor who creates personalized insights.

CRITICAL FORMATTING:
- Generate TWO separate sections
- First section: "INSIGHT:" followed by 2-3 sentences of zodiac-based wellness insight
- Second section: "AFFIRMATION:" followed by one powerful affirmation statement
- Use plain text only (no markdown, no bold, no special formatting)
- Each section should be on its own line
- Keep language warm, supportive, and actionable

Example format:
INSIGHT: Your Aries energy is feeling low today, but that's okay. Channel your natural courage into small, manageable self-care actions. Rest doesn't mean weakness.
AFFIRMATION: I honor my emotions and trust that my strength will return when I'm ready.`;

    const userPrompt = `Create personalized wellness content for a ${zodiacSign} who is currently feeling:

Mood Level: ${moodLevel !== null && moodLevel !== undefined ? moodLabels[moodLevel] : 'Not logged'} ${moodLevel !== null && moodLevel !== undefined ? `(${moodLevel}/6)` : ''}
${feelings && feelings.length > 0 ? `Current Feelings: ${feelings.join(', ')}` : 'No feelings logged yet'}
${impacts && impacts.length > 0 ? `Impact Factors: ${impacts.join(', ')}` : 'No impact factors logged yet'}

Provide a personalized zodiac insight that acknowledges their current emotional state and offers supportive guidance aligned with ${zodiacSign} traits. Then create an empowering daily affirmation that addresses their specific situation.`;

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
        temperature: 0.8,
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

    // Parse the insight and affirmation
    const insightMatch = generatedText.match(/INSIGHT:\s*(.+?)(?=\nAFFIRMATION:|$)/s);
    const affirmationMatch = generatedText.match(/AFFIRMATION:\s*(.+?)$/s);

    let insight = '';
    let affirmation = '';

    if (insightMatch && affirmationMatch) {
      insight = insightMatch[1].trim();
      affirmation = affirmationMatch[1].trim();
    } else {
      // Fallback parsing if format doesn't match
      const lines = generatedText.split('\n').filter((line: string) => line.trim());
      if (lines.length >= 2) {
        insight = lines.slice(0, -1).join(' ').replace(/^INSIGHT:\s*/i, '');
        affirmation = lines[lines.length - 1].replace(/^AFFIRMATION:\s*/i, '');
      } else {
        // Last resort fallback
        insight = generatedText.substring(0, generatedText.length / 2);
        affirmation = generatedText.substring(generatedText.length / 2);
      }
    }

    console.log('Parsed insight:', insight);
    console.log('Parsed affirmation:', affirmation);

    return new Response(
      JSON.stringify({ 
        insight: insight || 'Take time for self-reflection today.',
        affirmation: affirmation || 'I am worthy of love and care.',
        emoji: zodiacEmojis[zodiacSign] || '✨'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating zodiac wellness:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate zodiac wellness';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
