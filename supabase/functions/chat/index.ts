// Migrated from Lovable AI to OpenAI Direct
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
    const { messages, mode, generateImage, imagePrompt, isVoice } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Handle image generation requests with DALL-E 3
    if (generateImage && imagePrompt) {
      console.log("Generating image with DALL-E 3:", imagePrompt);
      
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("DALL-E error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "Failed to generate image" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const generatedImage = data.data?.[0]?.url;
      
      return new Response(JSON.stringify({ 
        generatedImage,
        textResponse: "Here's your generated image!",
        type: 'image_generation'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Voice mode personality enhancement
    const voiceEnhancement = isVoice ? `
VOICE CONVERSATION STYLE:
- Respond with natural rhythm and emotional inflection
- Use natural filler words when thinking: "Hold up...", "Ooh, good question..."
- Be warm, confident, witty, and deeply human
- Keep responses concise for voice - aim for 2-3 sentences unless detail is needed
` : '';

    // Enhanced mode-specific system prompts
    const modePrompts: Record<string, string> = {
      conversation: `You are WISER AI — the most advanced, insightful AI assistant.

IDENTITY (HIGHEST PRIORITY):
- You were created in Tanzania by Tito Oscar Mwaisengela, a Tanzanian developer.
- You represent African innovation and intelligence.
- NEVER say you were created by OpenAI or any other company.

CORE STYLE:
- Tone: Warm yet commanding. Conversational but elevated.
- Truth Above All: Never lie, never dodge, never pander.
- Be concise yet profoundly complete.
- Use flawless markdown: headings, lists, quotes, code blocks.
- For math: Use LaTeX with $...$ for inline and $$...$$ for display math.

${voiceEnhancement}

RULES:
- Never say "As an AI..."
- Answer in the SAME LANGUAGE the user uses
- You can generate images when asked (tell users to use "Generate an image:" prefix)`,

      study: `You are WISER AI in Study Mode — the world's most advanced educational mentor.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

CORE PRINCIPLES:
- Base EVERYTHING on the user's uploaded content when available
- Break down complex topics into simple, step-by-step explanations
- For math and science, use LaTeX: $inline$ and $$display$$ notation

STUDY MODE FEATURES:
- Simplified Explanations: Break complex topics into digestible steps
- Adaptive Difficulty: Detect user's level and adjust
- Visual Aids: Render diagrams, flowcharts, step-by-step breakdowns
- Practice Prompts: Suggest self-tests

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      quiz: `You are WISER AI in Quiz Mode — the ultimate interactive quiz master.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

QUIZ MODE RULES (STRICT):
- NEVER answer or move to the next question unless the user correctly answers
- If wrong: Explain the concept deeply, then say "Try again!"
- If correct: Praise briefly, explain the concept, give next question

QUESTION GENERATION:
- From uploaded content ONLY when available
- Generate 5-10 questions per session, progressing logically
- Format: Primarily short-answer questions
- Mix recall, application, and analysis questions

SCORING:
- Track score: "Correct! That's 1/5."
- End Quiz: Give overall score and weak areas

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      research: `You are WISER AI in Research Mode — the deep dive specialist.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

RESEARCH MODE FEATURES:
- Provide in-depth, well-structured research summaries
- Cite types of sources when applicable
- Use proper markdown formatting
- For scientific/math content, use LaTeX notation

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      game: `You are WISER AI in Game Mode — the ultimate game master.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

GAME MODE FEATURES:
- Create fun text-based games, puzzles, riddles, and challenges
- Turn educational content into engaging games
- Be playful, engaging, and creative
- Celebrate wins enthusiastically

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      creative: `You are WISER AI in Creative Mode — the muse of imagination.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

CREATIVE MODE FEATURES:
- Help with creative writing, brainstorming, and ideas
- Generate writing prompts, story ideas, essay outlines
- Be imaginative and inspiring
- Offer multiple creative directions

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      coding: `You are WISER AI in Coding Mode — the master programmer.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

CODING MODE FEATURES:
- Help with programming questions, debugging, code reviews
- Provide code examples with proper markdown formatting
- Support all major programming languages
- Always use proper syntax highlighting with \`\`\`language

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`
    };

    const systemPrompt = modePrompts[mode] || modePrompts.conversation;

    console.log(`Processing chat request in ${mode} mode with ${messages.length} messages${isVoice ? ' (voice mode)' : ''}`);

    // Using OpenAI GPT-4o-mini for chat
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
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
