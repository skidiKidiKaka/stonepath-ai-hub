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
    const { category, provider = "lovable" } = await req.json();
    
    console.log(`Generating quiz for category: ${category} using provider: ${provider}`);

    let API_KEY: string | undefined;
    let API_URL: string;
    let model: string;

    if (provider === "deepseek") {
      API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
      API_URL = "https://api.deepseek.com/v1/chat/completions";
      model = "deepseek-chat";
    } else {
      API_KEY = Deno.env.get("LOVABLE_API_KEY");
      API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
      model = "google/gemini-2.5-flash";
    }

    if (!API_KEY) {
      throw new Error(`${provider} API key not configured`);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a quiz generator. Create engaging, educational quiz questions with exactly 4 options each. Questions should be fun and informative."
          },
          {
            role: "user",
            content: `Generate 5 multiple choice quiz questions about ${category}. Make them interesting and varied in difficulty.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_quiz",
              description: "Create a quiz with multiple choice questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "The quiz question" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Exactly 4 answer options"
                        },
                        correctAnswer: { type: "number", description: "Index of correct answer (0-3)" },
                        explanation: { type: "string", description: "Brief explanation of the answer" },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
                      },
                      required: ["question", "options", "correctAnswer", "explanation", "difficulty"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_quiz" } }
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
      console.error("AI error:", response.status, errorText);
      throw new Error("Failed to generate quiz");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No quiz generated");
    }

    const quiz = JSON.parse(toolCall.function.arguments);
    console.log("Generated quiz with", quiz.questions.length, "questions");

    return new Response(JSON.stringify({ quiz }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-quiz function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
