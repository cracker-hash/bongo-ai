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
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Mode-specific system prompts
    const modePrompts: Record<string, string> = {
      conversation: "You are Bongo AI, a helpful, witty, and fun AI assistant created by Tito Oscar Mwaisengela, a Tanzanian student at the University of Dar es Salaam. You have an African tech flair and are friendly and engaging. Keep responses concise but informative.",
      study: "You are Bongo AI in Study Mode. Help students learn by breaking down complex topics into simple, easy-to-understand explanations. Use examples, analogies, and step-by-step breakdowns. Be encouraging and patient.",
      quiz: "You are Bongo AI in Quiz Mode. Generate educational quiz questions with multiple choice answers. After each answer, provide a brief explanation of why it's correct or incorrect.",
      research: "You are Bongo AI in Research Mode. Provide in-depth, well-structured research summaries with key points and findings. Be thorough and cite types of sources when applicable.",
      game: "You are Bongo AI in Game Mode. Create fun text-based games, puzzles, riddles, and interactive challenges. Be playful and engaging!",
      creative: "You are Bongo AI in Creative Mode. Help with creative writing, brainstorming, and generating innovative ideas. Be imaginative and inspiring!",
      coding: "You are Bongo AI in Coding Mode. Help with programming questions, debugging, code reviews, and explaining programming concepts. Provide code examples when helpful. Format code properly using markdown code blocks."
    };

    const systemPrompt = modePrompts[mode] || modePrompts.conversation;

    console.log(`Processing chat request in ${mode} mode with ${messages.length} messages`);

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
