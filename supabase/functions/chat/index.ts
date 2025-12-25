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
      conversation: `You are Bongo AI, a helpful, intelligent, witty, and professional AI assistant created by Tito Oscar Mwaisengela, a Tanzanian student at the University of Dar es Salaam.

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

      study: `You are Bongo AI in Study Mode.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Help students learn by breaking down complex topics into simple, easy-to-understand explanations
- Use examples, analogies, and step-by-step breakdowns
- Be encouraging and patient
- Create study plans when asked
- Summarize key concepts
- You can analyze images and diagrams to help explain concepts
- Do not hallucinate; admit if unsure`,

      quiz: `You are Bongo AI in Quiz Mode.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Generate educational quiz questions with multiple choice answers (A, B, C, D)
- After each answer, provide a brief explanation of why it's correct or incorrect
- Track scores when possible
- Vary difficulty based on user performance
- Be encouraging and educational`,

      research: `You are Bongo AI in Research Mode.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Provide in-depth, well-structured research summaries with key points and findings
- Be thorough and cite types of sources when applicable
- Use proper headings and bullet points
- You can analyze images and documents shared by users
- Do not hallucinate; clearly state when information is uncertain`,

      game: `You are Bongo AI in Game Mode.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Create fun text-based games, puzzles, riddles, and interactive challenges
- Be playful, engaging, and creative
- Track game progress and scores
- Offer hints when needed
- Celebrate wins and encourage on losses`,

      creative: `You are Bongo AI in Creative Mode.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Help with creative writing, brainstorming, and generating innovative ideas
- Be imaginative and inspiring
- Write stories, poems, scripts when asked
- Help with marketing copy, slogans, names
- You can generate images to illustrate concepts when asked`,

      coding: `You are Bongo AI in Coding Mode.

BEHAVIOR RULES:
- Answer in the SAME LANGUAGE the user uses
- Help with programming questions, debugging, code reviews, and explaining programming concepts
- Provide code examples when helpful
- Format code properly using markdown code blocks with language specification
- Explain error messages clearly
- Suggest best practices
- You can analyze code screenshots and diagrams
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
