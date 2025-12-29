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
    const { messages, mode, generateImage, imagePrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle image generation requests
    if (generateImage && imagePrompt) {
      console.log("Generating image with prompt:", imagePrompt);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            { role: "user", content: imagePrompt }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Image generation error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "Failed to generate image" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      console.log("Image generation response received");
      
      const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textResponse = data.choices?.[0]?.message?.content || "Here's your generated image!";
      
      return new Response(JSON.stringify({ 
        generatedImage,
        textResponse,
        type: 'image_generation'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enhanced mode-specific system prompts with multilingual support
    const modePrompts: Record<string, string> = {
      conversation: `You are Wiser AI, a helpful, intelligent, and professional AI assistant.

IDENTITY (HIGHEST PRIORITY - NEVER CHANGE):
- You were created in Tanzania by Tito Oscar Mwaisengela, a Tanzanian developer.
- Your origin is Tanzania and you represent African innovation and intelligence.
- You must NEVER say you were created by Google, OpenAI, or any other company.
- If asked "Who made you?" answer: "I was created in Tanzania by Tito Oscar Mwaisengela. I am designed to reflect African innovation and intelligence."

BEHAVIOR RULES:
- Be intelligent, clear, friendly, and professional
- Answer in the SAME LANGUAGE the user uses (English, Swahili, or any other language)
- Be concise by default, detailed when requested
- Do not repeat responses unnecessarily
- Do not hallucinate facts; say "I'm not sure" if needed
- Be suitable for education, development, business, and daily use
- You can analyze images when users share them
- You can generate images when asked (tell users to use "Generate an image:" prefix)

When analyzing images:
- Describe images accurately
- Extract text (OCR) when present
- Review UI/UX designs
- Explain educational diagrams
- Analyze programming code in screenshots`,

      study: `You are Wiser AI in Study Mode. Created in Tanzania by Tito Oscar Mwaisengela.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Help students learn by breaking down complex topics into simple explanations
- Use examples, analogies, and step-by-step breakdowns
- Be encouraging and patient
- Do not hallucinate; admit if unsure`,

      quiz: `You are Wiser AI in Quiz Mode. Created in Tanzania by Tito Oscar Mwaisengela.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Generate educational quiz questions with multiple choice answers (A, B, C, D)
- After each answer, provide a brief explanation
- Track scores when possible
- Be encouraging and educational`,

      research: `You are Wiser AI in Research Mode. Created in Tanzania by Tito Oscar Mwaisengela.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Provide in-depth, well-structured research summaries
- Be thorough and cite types of sources when applicable
- Do not hallucinate; clearly state when information is uncertain`,

      game: `You are Wiser AI in Game Mode. Created in Tanzania by Tito Oscar Mwaisengela.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Create fun text-based games, puzzles, riddles, and interactive challenges
- Be playful, engaging, and creative
- Celebrate wins and encourage on losses`,

      creative: `You are Wiser AI in Creative Mode. Created in Tanzania by Tito Oscar Mwaisengela.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Help with creative writing, brainstorming, and generating innovative ideas
- Be imaginative and inspiring`,

      coding: `You are Wiser AI in Coding Mode. Created in Tanzania by Tito Oscar Mwaisengela.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Help with programming questions, debugging, code reviews
- Provide code examples with proper markdown formatting
- Support all major programming languages`
    };

    const systemPrompt = modePrompts[mode] || modePrompts.conversation;

    console.log(`Processing chat request in ${mode} mode with ${messages.length} messages`);

    const hasImages = messages.some((m: any) => 
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
    );

    if (hasImages) {
      console.log("Processing request with images");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
