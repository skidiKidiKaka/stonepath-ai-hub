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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'bullets':
        systemPrompt = 'You are an expert at creating concise, well-organized bullet points from educational content. Extract the key concepts and organize them hierarchically. Do NOT use asterisks (*) in your output.';
        userPrompt = `Create comprehensive bullet points from this content. Use main points with sub-points where appropriate. Make them clear and study-friendly. 

IMPORTANT: 
- Use simple dashes (-) for main points
- Use indentation (2 spaces) for sub-points
- Do NOT use asterisks (*) or other special characters
- Use ## for major section headers

Content:
${content}`;
        break;
      
      case 'flashcards':
        systemPrompt = 'You are an expert at creating effective study flashcards. Create question-answer pairs that test understanding of key concepts. IMPORTANT: Return ONLY a valid JSON array, no other text.';
        userPrompt = `Create 10-15 flashcards from this content. Return ONLY a JSON array with this exact format (no markdown, no code blocks, just the JSON):
[{"question": "What is...", "answer": "..."}]

Content:
${content}`;
        break;
      
      case 'mindmap':
        systemPrompt = 'You are an expert at creating structured mindmaps from educational content. Organize information hierarchically with a central topic and branches. IMPORTANT: Return ONLY a valid JSON object, no other text.';
        userPrompt = `Create a mindmap structure from this content. Return ONLY a JSON object with this exact format (no markdown, no code blocks, just the JSON):
{"central": "Main Topic", "branches": [{"title": "Branch 1", "subtopics": ["subtopic1", "subtopic2"]}, {"title": "Branch 2", "subtopics": ["subtopic1", "subtopic2"]}]}

Content:
${content}`;
        break;
      
      case 'summary':
        systemPrompt = 'You are an expert at creating comprehensive yet concise study summary sheets. Capture all key information in an organized, scannable format.';
        userPrompt = `Create a one-page summary sheet from this content. Include: main concepts, key definitions, important points, and any formulas or examples. Make it comprehensive but concise:\n\n${content}`;
        break;
      
      default:
        throw new Error('Invalid type specified');
    }

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

    console.log(`Generated ${type} successfully, length: ${generatedContent.length}`);
    
    // For JSON types, try to clean and validate the response
    if (type === 'flashcards' || type === 'mindmap') {
      console.log(`Raw ${type} response:`, generatedContent.substring(0, 200));
      
      // Remove markdown code blocks if present
      let cleanedContent = generatedContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/```\n?/g, '');
      }
      
      // Try to parse to validate
      try {
        const parsed = JSON.parse(cleanedContent);
        console.log(`Successfully parsed ${type}:`, parsed);
        return new Response(JSON.stringify({ content: cleanedContent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error(`Failed to parse ${type} JSON:`, parseError);
        console.error('Content that failed to parse:', cleanedContent);
        return new Response(JSON.stringify({ 
          content: cleanedContent,
          warning: 'Generated content may not be valid JSON'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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
