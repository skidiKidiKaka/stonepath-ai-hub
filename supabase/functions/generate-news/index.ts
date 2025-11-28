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
    const { provider = 'lovable' } = await req.json();
    
    let apiKey: string | undefined;
    let apiUrl: string;
    let requestBody: any;

    if (provider === 'deepseek') {
      apiKey = Deno.env.get('DEEPSEEK_API_KEY');
      if (!apiKey) {
        throw new Error('DeepSeek API key not configured');
      }
      apiUrl = 'https://api.deepseek.com/chat/completions';
      requestBody = {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a news curator for high school students. Generate 5 engaging, relevant news items that would interest teenagers. Each news item should have a catchy title, brief summary, detailed content, category, and a description for an image that represents the story.'
          },
          {
            role: 'user',
            content: 'Generate 5 current news items relevant to high school students. Include topics like technology, science, education, entertainment, sports, and social trends. Make them engaging and age-appropriate.'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_news',
              description: 'Generate news items for high school students',
              parameters: {
                type: 'object',
                properties: {
                  news: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Catchy news title' },
                        summary: { type: 'string', description: 'Brief 1-2 sentence summary' },
                        content: { type: 'string', description: 'Detailed 3-4 paragraph article content' },
                        category: { type: 'string', description: 'Category like Tech, Science, Sports, etc.' },
                        imagePrompt: { type: 'string', description: 'Description for generating an image' }
                      },
                      required: ['title', 'summary', 'content', 'category', 'imagePrompt'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['news'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_news' } }
      };
    } else {
      apiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!apiKey) {
        throw new Error('Lovable AI API key not configured');
      }
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      requestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a news curator for high school students. Generate 5 engaging, relevant news items that would interest teenagers. Each news item should have a catchy title, brief summary, detailed content, category, and a description for an image that represents the story.'
          },
          {
            role: 'user',
            content: 'Generate 5 current news items relevant to high school students. Include topics like technology, science, education, entertainment, sports, and social trends. Make them engaging and age-appropriate.'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_news',
              description: 'Generate news items for high school students',
              parameters: {
                type: 'object',
                properties: {
                  news: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Catchy news title' },
                        summary: { type: 'string', description: 'Brief 1-2 sentence summary' },
                        content: { type: 'string', description: 'Detailed 3-4 paragraph article content' },
                        category: { type: 'string', description: 'Category like Tech, Science, Sports, etc.' },
                        imagePrompt: { type: 'string', description: 'Description for generating an image' }
                      },
                      required: ['title', 'summary', 'content', 'category', 'imagePrompt'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['news'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_news' } }
      };
    }

    console.log(`Generating news with ${provider}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const newsData = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify(newsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
