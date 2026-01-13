// Secured Chat Edge Function with auth, validation, and restricted CORS
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://wiser-ai.lovable.app',
  'https://gbbqdmgrjtdliiddikwq.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o.replace(/:\d+$/, ''))) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Input validation schema
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([z.string().max(50000), z.array(z.any())])
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
  mode: z.enum(['conversation', 'study', 'quiz', 'research', 'game', 'creative', 'coding']).optional(),
  model: z.string().max(50).optional(),
  generateImage: z.boolean().optional(),
  imagePrompt: z.string().max(1000).optional(),
  isVoice: z.boolean().optional()
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = ChatRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages, mode = 'conversation', model, generateImage, imagePrompt, isVoice } = validationResult.data;
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      console.error("No AI API key configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
    
    const selectedModel = modelMap[model || ''] || 'openai/gpt-4o-mini';

    // Handle image generation requests with Freepik API
    if (generateImage && imagePrompt) {
      console.log("Image generation request received");
      
      const FREEPIK_API_KEY = Deno.env.get("FREEPIK_API_KEY");
      
      if (!FREEPIK_API_KEY) {
        console.error("Image service not configured");
        return new Response(JSON.stringify({ error: "Image generation unavailable" }), {
          status: 503,
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
            prompt: imagePrompt.slice(0, 1000),
            negative_prompt: "blurry, low quality, distorted, ugly, deformed",
            num_images: 1,
            image: { size: "square_1_1" },
            styling: { style: "photo", color: "vibrant" },
          }),
        });

        if (!response.ok) {
          console.error("Image generation failed:", response.status);
          return new Response(JSON.stringify({ error: "Image generation failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const generatedImageBase64 = data.data?.[0]?.base64;
        
        if (!generatedImageBase64) {
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

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      quiz: `You are WISER AI in Quiz Mode — the ultimate interactive quiz master.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

QUIZ MODE RULES (STRICT):
- NEVER answer or move to the next question unless the user correctly answers
- If wrong: Explain the concept deeply, then say "Try again!"
- If correct: Praise briefly, explain the concept, give next question

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      research: `You are WISER AI in Research Mode — the deep dive specialist.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

RESEARCH MODE FEATURES:
- Provide in-depth, well-structured research summaries
- Use proper markdown formatting

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      game: `You are WISER AI in Game Mode — the ultimate game master.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

GAME MODE FEATURES:
- Create fun text-based games, puzzles, riddles
- Be playful, engaging, and creative

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      creative: `You are WISER AI in Creative Mode — the muse of imagination.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

CREATIVE MODE FEATURES:
- Help with creative writing, brainstorming
- Be imaginative and inspiring

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      coding: `You are WISER AI in Coding Mode — the master programmer.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

CODING MODE FEATURES:
- Help with programming, debugging, code reviews
- Use proper syntax highlighting

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`
    };

    const systemPrompt = modePrompts[mode] || modePrompts.conversation;

    console.log(`Chat request: mode=${mode}, messages=${messages.length}, user=${claimsData.user.id.slice(0, 8)}`);

    // Using OpenRouter API for chat with retry logic
    const maxRetries = 3;
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const apiUrl = useOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions" 
      : "https://api.openai.com/v1/chat/completions";
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const finalModel = useOpenRouter ? selectedModel : "gpt-4o-mini";
    
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
          console.error("API credits exhausted");
          return new Response(JSON.stringify({ error: "Service credits exhausted. Please try again later." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          return new Response(JSON.stringify({ error: "Service is busy. Please wait and try again." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.error("API error:", response.status);
        return new Response(JSON.stringify({ error: "Unable to process request" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchError) {
        console.error(`Attempt ${attempt + 1} failed:`, fetchError);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: "Unable to process request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});