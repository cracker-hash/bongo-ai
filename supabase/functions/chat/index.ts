// Using OpenRouter API for chat
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
    const { messages, mode, model, generateImage, imagePrompt, isVoice } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      throw new Error("No API key configured (OPENROUTER_API_KEY or OPENAI_API_KEY)");
    }
    
    // Model mapping from frontend to OpenRouter
    const modelMap: Record<string, string> = {
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'gpt-4o': 'openai/gpt-4o',
      'gpt-4-turbo': 'openai/gpt-4-turbo',
      'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
      'claude-3-opus': 'anthropic/claude-3-opus',
      'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
      'gemini-1.5-pro': 'google/gemini-pro-1.5',
      'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
      'deepseek-r1': 'deepseek/deepseek-r1',
    };
    
    const selectedModel = modelMap[model] || 'openai/gpt-4o-mini';

    // Handle image generation requests with Freepik API
    if (generateImage && imagePrompt) {
      console.log("Generating image with Freepik Mystic:", imagePrompt);
      
      const FREEPIK_API_KEY = Deno.env.get("FREEPIK_API_KEY");
      
      if (!FREEPIK_API_KEY) {
        console.error("FREEPIK_API_KEY not configured");
        return new Response(JSON.stringify({ error: "Image generation service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        const response = await fetch("https://api.freepik.com/v1/ai/mystic", {
          method: "POST",
          headers: {
            "x-freepik-api-key": FREEPIK_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            negative_prompt: "blurry, low quality, distorted, ugly, deformed",
            num_images: 1,
            image: {
              size: "square_1_1",
            },
            styling: {
              style: "photo",
              color: "vibrant",
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Freepik error:", response.status, errorText);
          return new Response(JSON.stringify({ error: "Failed to generate image" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const generatedImageBase64 = data.data?.[0]?.base64;
        
        if (!generatedImageBase64) {
          console.error("No image data in Freepik response");
          return new Response(JSON.stringify({ error: "No image generated" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ 
          generatedImage: `data:image/png;base64,${generatedImageBase64}`,
          textResponse: "Here's your generated image!",
          type: 'image_generation'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (imgError) {
        console.error("Image generation error:", imgError);
        return new Response(JSON.stringify({ error: "Image generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    // Using OpenRouter API for chat with retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    // Use OpenRouter if available, fallback to OpenAI
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const apiUrl = useOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions" 
      : "https://api.openai.com/v1/chat/completions";
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const finalModel = useOpenRouter ? selectedModel : "gpt-4o-mini";
    
    console.log(`Using ${useOpenRouter ? 'OpenRouter' : 'OpenAI'} API with model: ${finalModel}`);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(useOpenRouter && { "HTTP-Referer": "https://wiser-ai.lovable.app" }),
            ...(useOpenRouter && { "X-Title": "Wiser AI" }),
          },
          body: JSON.stringify({
            model: finalModel,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            stream: true,
            max_tokens: 2048,
          }),
        });

        if (response.ok) {
          return new Response(response.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        if (response.status === 402) {
          console.error("OpenRouter credits exhausted");
          return new Response(JSON.stringify({ error: "API credits exhausted. Please add credits to OpenRouter or contact support." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, attempt ${attempt + 1}/${maxRetries}, waiting ${waitTime}ms`);
          
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          console.error("Rate limit exceeded after retries");
          return new Response(JSON.stringify({ error: "Service is busy. Please wait a moment and try again." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const errorText = await response.text();
        console.error("API error:", response.status, errorText);
        return new Response(JSON.stringify({ error: `AI service error: ${response.status}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error("Failed after retries");
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
