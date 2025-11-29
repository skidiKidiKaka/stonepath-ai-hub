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
    const { content, type } = await req.json();
    console.log('Generating notes for type:', type);

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'bullets':
        systemPrompt = 'You are an expert at creating concise, well-organized bullet points from educational content. Extract the key concepts and organize them hierarchically.';
        userPrompt = `Create comprehensive bullet points from this content. Use main points with sub-points where appropriate. Make them clear and study-friendly:\n\n${content}`;
        break;
      
      case 'flashcards':
        systemPrompt = 'You are an expert at creating effective study flashcards. Create question-answer pairs that test understanding of key concepts.';
        userPrompt = `Create 10-15 flashcards from this content. Return them as a JSON array with "question" and "answer" fields. Focus on important concepts, definitions, and facts:\n\n${content}`;
        break;
      
      case 'mindmap':
        systemPrompt = 'You are an expert at creating structured mindmaps from educational content. Organize information hierarchically with a central topic and branches.';
        userPrompt = `Create a mindmap structure from this content. Return it as JSON with a "central" topic and "branches" array, where each branch has a "title" and "subtopics" array:\n\n${content}`;
        break;
      
      case 'summary':
        systemPrompt = 'You are an expert at creating comprehensive yet concise study summary sheets. Capture all key information in an organized, scannable format.';
        userPrompt = `Create a one-page summary sheet from this content. Include: main concepts, key definitions, important points, and any formulas or examples. Make it comprehensive but concise:\n\n${content}`;
        break;
      
      default:
        throw new Error('Invalid type specified');
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated notes successfully');

    return new Response(JSON.stringify({ content: generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating notes:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
