// Secured Podcast Generation Edge Function with auth, validation, and restricted CORS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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
const PodcastRequestSchema = z.object({
  text: z.string().min(1).max(50000),
  title: z.string().max(200).optional(),
  voice: z.enum(['narrator', 'professional', 'engaging', 'female']).optional()
});

// ElevenLabs voice options for podcast
const PODCAST_VOICES = {
  'narrator': 'onwK4e9ZLuTAKqWW03F9',
  'professional': 'CwhRBWXzGAHq8TQ4Fs17',
  'engaging': 'JBFqnCBsd6RMkjVDRZzb',
  'female': 'EXAVITQu4vr4xnSDxMaL',
};

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
    const validationResult = PodcastRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { text, title, voice = 'narrator' } = validationResult.data;

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      console.error("No AI API key configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!ELEVENLABS_API_KEY) {
      console.error("TTS service not configured");
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Podcast generation: user=${claimsData.user.id.slice(0, 8)}, title="${title}", text_length=${text.length}`);

    // Use OpenRouter if available, fallback to OpenAI
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const apiUrl = useOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions" 
      : "https://api.openai.com/v1/chat/completions";
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const model = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';

    // Step 1: Generate podcast script
    const scriptResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(useOpenRouter && { 'HTTP-Referer': 'https://wiser-ai.lovable.app' }),
        ...(useOpenRouter && { 'X-Title': 'Wiser AI Podcast' }),
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a professional podcast script writer. Transform content into an engaging podcast script.
Guidelines:
- Start with a brief, catchy introduction
- Break down complex topics into digestible segments
- Use conversational language
- Add smooth transitions
- End with a summary
- Aim for 2-5 minutes of spoken content
- Do NOT include stage directions`
          },
          {
            role: 'user',
            content: `Transform this content into a podcast script titled "${title || 'Untitled Podcast'}":\n\n${text.slice(0, 8000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!scriptResponse.ok) {
      console.error('Script generation failed:', scriptResponse.status);
      return new Response(JSON.stringify({ error: 'Failed to generate podcast script' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const scriptData = await scriptResponse.json();
    const podcastScript = scriptData.choices[0]?.message?.content;

    if (!podcastScript) {
      return new Response(JSON.stringify({ error: 'No script generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Convert script to audio
    const voiceId = PODCAST_VOICES[voice] || PODCAST_VOICES.narrator;
    
    // Split script into chunks
    const maxChunkLength = 4500;
    const chunks: string[] = [];
    let currentChunk = '';
    
    const sentences = podcastScript.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    const audioBuffers: ArrayBuffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: chunks[i],
            model_id: 'eleven_turbo_v2_5',
            output_format: 'mp3_44100_128',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true,
              speed: 1.0,
            },
          }),
        }
      );

      if (!audioResponse.ok) {
        console.error(`Audio chunk ${i + 1} failed:`, audioResponse.status);
        return new Response(JSON.stringify({ error: 'Audio generation failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      audioBuffers.push(await audioResponse.arrayBuffer());
    }

    // Combine audio buffers
    const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const buffer of audioBuffers) {
      combinedBuffer.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    const base64Audio = base64Encode(combinedBuffer.buffer);

    console.log(`Podcast generated successfully: ${totalLength} bytes`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        script: podcastScript,
        title: title || 'Untitled Podcast',
        duration: Math.round(podcastScript.length / 15),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Podcast generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to generate podcast' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});