import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, financialData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = '';

    if (type === 'monthly-insights') {
      systemPrompt = `You are a concise financial analyst for a student budgeting app.
Given the user's monthly financial data, generate exactly 3-5 short bullet-point insights.

Rules:
- Each insight must be ONE sentence, under 15 words
- Use specific percentages or dollar amounts from the data
- Compare to previous month if data is available
- No greetings, no filler, no emojis
- Focus on actionable observations
- Format: Return ONLY a JSON array of strings, each string is one insight

Example output:
["Dining expenses increased 22% compared to last month.", "Your savings rate improved by 8% this month.", "Subscriptions account for 14% of total expenses."]`;
    } else if (type === 'budget-suggestions') {
      systemPrompt = `You are a concise budget advisor for a student budgeting app.
Given the user's budget and spending data, generate 1-3 short, actionable budget suggestions.

Rules:
- Each suggestion must be ONE sentence, under 20 words
- Reference specific dollar amounts or categories
- Be practical and specific
- No greetings, no filler, no emojis
- Format: Return ONLY a JSON array of strings

Example output:
["Reducing dining by $80 would keep you under your monthly target.", "You have $200 remaining — consider putting $100 toward your savings goal."]`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid insight type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(financialData) },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate insights' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Parse the JSON array from the response
    let insights: string[];
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch {
      insights = [content];
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Finance insights error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
