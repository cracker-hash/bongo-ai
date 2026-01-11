import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ElevenLabs voice options for podcast
const PODCAST_VOICES = {
  'narrator': 'onwK4e9ZLuTAKqWW03F9', // Daniel - clear male narrator
  'professional': 'CwhRBWXzGAHq8TQ4Fs17', // Roger - professional tone
  'engaging': 'JBFqnCBsd6RMkjVDRZzb', // George - warm engaging
  'female': 'EXAVITQu4vr4xnSDxMaL', // Sarah - clear female
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, title, voice = 'narrator' } = await req.json();
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text content is required');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      throw new Error('No API key configured (OPENROUTER_API_KEY or OPENAI_API_KEY)');
    }
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log(`Podcast generation started: title="${title}", text length=${text.length}`);

    // Use OpenRouter if available, fallback to OpenAI
    const useOpenRouter = !!OPENROUTER_API_KEY;
    const apiUrl = useOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions" 
      : "https://api.openai.com/v1/chat/completions";
    const apiKey = useOpenRouter ? OPENROUTER_API_KEY : OPENAI_API_KEY;
    const model = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
    
    console.log(`Using ${useOpenRouter ? 'OpenRouter' : 'OpenAI'} for script generation`);

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
            content: `You are a professional podcast script writer. Transform the given content into an engaging podcast script. 
            
Guidelines:
- Start with a brief, catchy introduction
- Break down complex topics into digestible segments
- Use conversational language that sounds natural when spoken
- Add smooth transitions between topics
- Include occasional rhetorical questions to keep listeners engaged
- End with a summary and closing remarks
- Keep the script suitable for audio (no visual references)
- Aim for about 2-5 minutes of spoken content
- Do NOT include stage directions or speaker labels, just the spoken text`
          },
          {
            role: 'user',
            content: `Transform this content into a podcast script titled "${title || 'Untitled Podcast'}":\n\n${text.slice(0, 8000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!scriptResponse.ok) {
      const errorText = await scriptResponse.text();
      console.error('OpenAI script generation error:', errorText);
      throw new Error('Failed to generate podcast script');
    }

    const scriptData = await scriptResponse.json();
    const podcastScript = scriptData.choices[0]?.message?.content;

    if (!podcastScript) {
      throw new Error('No script generated');
    }

    console.log(`Script generated, length: ${podcastScript.length}`);

    // Step 2: Convert script to audio using ElevenLabs
    const voiceId = PODCAST_VOICES[voice as keyof typeof PODCAST_VOICES] || PODCAST_VOICES.narrator;
    
    // Split script into chunks if too long (ElevenLabs has limits)
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

    console.log(`Processing ${chunks.length} audio chunk(s)`);

    // Process chunks and combine
    const audioBuffers: ArrayBuffer[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
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
            output_format: 'mp3_44100_128', // Higher quality for podcast
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
        const errorText = await audioResponse.text();
        console.error(`ElevenLabs chunk ${i + 1} error:`, errorText);
        throw new Error(`Failed to generate audio for chunk ${i + 1}`);
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

    console.log(`Podcast generated successfully, size: ${totalLength} bytes`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        script: podcastScript,
        title: title || 'Untitled Podcast',
        duration: Math.round(podcastScript.length / 15), // Rough estimate in seconds
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Podcast generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Podcast generation failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
