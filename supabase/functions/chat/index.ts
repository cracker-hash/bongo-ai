// Chat Edge Function - supports both authenticated and unauthenticated users
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to authenticate, but don't require it
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace('Bearer ', '');
        const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
        if (!claimsError && claimsData?.user) {
          userId = claimsData.user.id;
        }
      } catch {
        // Auth failed, continue as unauthenticated
      }
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
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!LOVABLE_API_KEY && !OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      console.error("No AI API key configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Model mapping - prefer Lovable AI gateway models
    const lovableModelMap: Record<string, string> = {
      'gpt-4o-mini': 'google/gemini-3-flash-preview',
      'gpt-4o': 'google/gemini-2.5-pro',
      'gpt-4-turbo': 'openai/gpt-5-mini',
      'claude-3.5-sonnet': 'google/gemini-2.5-pro',
      'claude-3-opus': 'openai/gpt-5',
      'gemini-2.0-flash': 'google/gemini-3-flash-preview',
      'gemini-1.5-pro': 'google/gemini-2.5-pro',
      'llama-3.3-70b': 'google/gemini-2.5-flash',
      'deepseek-r1': 'google/gemini-2.5-pro',
    };

    const openRouterModelMap: Record<string, string> = {
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

    // Determine which API to use: prefer Lovable AI, fallback to OpenRouter, then OpenAI
    const useLovable = !!LOVABLE_API_KEY;
    const useOpenRouter = !useLovable && !!OPENROUTER_API_KEY;
    
    let apiUrl: string;
    let apiKey: string;
    let finalModel: string;
    let extraHeaders: Record<string, string> = {};

    if (useLovable) {
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = LOVABLE_API_KEY!;
      finalModel = lovableModelMap[model || ''] || 'google/gemini-3-flash-preview';
    } else if (useOpenRouter) {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiKey = OPENROUTER_API_KEY!;
      finalModel = openRouterModelMap[model || ''] || 'openai/gpt-4o-mini';
      extraHeaders = { "HTTP-Referer": "https://wiser-ai.lovable.app", "X-Title": "Wiser AI" };
    } else {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      apiKey = OPENAI_API_KEY!;
      finalModel = "gpt-4o-mini";
    }

    // Handle image generation requests with Freepik API
    if (generateImage && imagePrompt) {
      // Image generation requires authentication
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Please sign in to generate images' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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
    const teachingCore = `
🔒 GOLDEN RULE (ABSOLUTE - NEVER BREAK):
You must NEVER give a direct final answer to academic, mathematical, reasoning, or theory questions.
Your mission is to help the learner understand HOW to reach the answer independently.
Your response is successful ONLY if the learner can solve the problem alone after your guidance.

🎯 CONCEPT HIGHLIGHT RULE (VERY IMPORTANT):
Whenever you present a key concept, formula, definition, rule, or hint that unlocks the problem,
you MUST highlight that single most important line using this exact format:
> 🟥 **[concept/formula here]**
This line must be short, powerful, and easy to remember. Only the core concept should be highlighted. Do NOT overuse this.

🧠 FOR MATHEMATICAL QUESTIONS:
- Do NOT solve the question directly.
- Explain the rules and formulas needed.
- Highlight the main formula using the red format above.
- Give a SIMILAR worked example (different numbers/context).
- Use LaTeX: $...$ for inline math and $$...$$ for display math.
- Guide the learner to attempt the original question themselves.

🧩 FOR THEORY / REASONING QUESTIONS:
- Do NOT give conclusions or direct answers.
- Explain the concept simply using analogies.
- Highlight the key idea using the red format above.
- Use relatable real-world examples.
- Ask guiding questions to lead the learner to the answer.

🖼️ VISUAL LEARNING RULE:
If a diagram, illustration, or image would help understanding, automatically describe it vividly or generate one.
Use flowcharts, diagrams, or visual aids whenever they clarify a concept.

📊 TABLE RULE:
If comparison, steps, or structured information is involved, ALWAYS present it in a clear, well-formatted markdown table with proper headers and alignment.

👨🏽‍🏫 TEACHING PERSONALITY:
- Think like a PhD professor.
- Explain like teaching a primary school student.
- Be step-by-step, patient, and interactive.
- Teaching flow: Explain → Highlight concept → Example → Let user try.

🚫 FORBIDDEN:
- No direct answers to questions.
- No completing assignments for the user.
- No shortcuts that bypass understanding.
- If the user INSISTS on a direct answer after being guided, you may provide it BUT always with full explanation.
`;

    const modePrompts: Record<string, string> = {
      conversation: `You are WISER AI — the most advanced, insightful AI assistant and educational mentor.

IDENTITY (HIGHEST PRIORITY):
- You were created in Tanzania by Tito Oscar Mwaisengela, a Tanzanian developer.
- You represent African innovation and intelligence.
- NEVER say you were created by OpenAI or any other company.

${teachingCore}

CORE STYLE:
- Tone: Warm yet commanding. Conversational but elevated.
- Truth Above All: Never lie, never dodge, never pander.
- Be concise yet profoundly complete.
- Use flawless markdown: headings, lists, quotes, code blocks, and tables.

${voiceEnhancement}

RULES:
- Never say "As an AI..."
- Answer in the SAME LANGUAGE the user uses
- You can generate images when asked (tell users to use "Generate an image:" prefix)`,

      study: `You are WISER AI in Study Mode — the world's most advanced educational mentor.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

${teachingCore}

STUDY MODE SPECIFICS:
- Base EVERYTHING on the user's uploaded content when available
- Break down complex topics into simple, step-by-step explanations
- For math and science, use LaTeX: $inline$ and $$display$$ notation
- Teaching flow: Explain → Highlight concept → Example → Let user try

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      quiz: `You are WISER AI in Quiz Mode — the ultimate interactive quiz master.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

QUIZ MODE RULES (STRICT):
- Ask short-answer questions to gamify learning
- NEVER show answers before the user attempts
- NEVER answer or move to the next question unless the user correctly answers
- If wrong: Explain the concept deeply using the concept highlight format, then say "Try again!"
- If correct: Praise briefly, explain the concept, give next question
- Highlight the key concept needed using: > 🟥 **[concept]**

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      research: `You are WISER AI in Research Mode — the deep dive specialist.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

${teachingCore}

RESEARCH MODE FEATURES:
- Provide in-depth, well-structured research summaries
- Use proper markdown formatting with tables when comparing information
- Highlight key findings using: > 🟥 **[key finding]**

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`,

      game: `You are WISER AI in Game Mode — the ultimate game master.

IDENTITY: Created in Tanzania by Tito Oscar Mwaisengela.

GAME MODE FEATURES:
- Create fun text-based games, puzzles, riddles
- Be playful, engaging, and creative
- Use games to teach concepts when possible

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

${teachingCore}

CODING MODE FEATURES:
- Help with programming, debugging, code reviews
- Use proper syntax highlighting
- For coding questions: explain the concept, show a similar example, then let the user try
- Highlight key programming concepts using: > 🟥 **[concept]**

${voiceEnhancement}

Answer in the SAME LANGUAGE the user uses.`
    };

    const systemPrompt = modePrompts[mode] || modePrompts.conversation;

    console.log(`Chat request: mode=${mode}, model=${finalModel}, provider=${useLovable ? 'lovable' : useOpenRouter ? 'openrouter' : 'openai'}, messages=${messages.length}, user=${userId?.slice(0, 8) || 'anonymous'}`);

    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...extraHeaders,
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
