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
    const { dietary, cuisine, prepTime, calories, allergies } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating recipe with preferences:", { dietary, cuisine, prepTime, calories, allergies });

    const prompt = `Generate a healthy recipe with the following preferences:
- Dietary restrictions: ${dietary || "None"}
- Cuisine type: ${cuisine || "Any"}
- Prep time: ${prepTime || "30 minutes or less"}
- Target calories: ${calories || "400-600"} per serving
- Allergies/Avoid: ${allergies || "None"}

Please provide a complete, nutritious recipe that meets these criteria.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional nutritionist and chef. Create healthy, delicious recipes with clear instructions and accurate nutritional information."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_recipe",
              description: "Create a structured recipe with nutritional information",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Recipe name" },
                  description: { type: "string", description: "Brief description" },
                  prepTime: { type: "string", description: "Preparation time" },
                  cookTime: { type: "string", description: "Cooking time" },
                  servings: { type: "number", description: "Number of servings" },
                  ingredients: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of ingredients with quantities"
                  },
                  instructions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Step-by-step cooking instructions"
                  },
                  nutrition: {
                    type: "object",
                    properties: {
                      calories: { type: "number" },
                      protein: { type: "string" },
                      carbs: { type: "string" },
                      fats: { type: "string" }
                    },
                    required: ["calories", "protein", "carbs", "fats"]
                  }
                },
                required: ["name", "description", "prepTime", "cookTime", "servings", "ingredients", "instructions", "nutrition"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_recipe" } }
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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate recipe");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No recipe generated");
    }

    const recipe = JSON.parse(toolCall.function.arguments);
    console.log("Generated recipe:", recipe.name);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-recipe function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
