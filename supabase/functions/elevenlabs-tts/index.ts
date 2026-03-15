import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VOICE_IDS: Record<string, string> = {
  'rachel': '21m00Tcm4TlvDq8ikWAM',
  'sarah': 'EXAVITQu4vr4xnSDxMaL',
  'roger': 'CwhRBWXzGAHq8TQ4Fs17',
  'brian': 'nPczCjzI2devNBz1zQrb',
  'george': 'JBFqnCBsd6RMkjVDRZzb',
  'alice': 'Xb7hH8MSUJpSbSDYk0k2',
  'lily': 'pFZP5JQG7iQjIQuC4Bku',
  'jessica': 'cgSgspJ2msm6clMCkdW9',
  'eric': 'cjVigY5qzO86Huf0OWal',
  'chris': 'iP95p4xoKVk53GoZ742B',
  'daniel': 'onwK4e9ZLuTAKqWW03F9',
  'matilda': 'XrExE9yKIg1WjnnlVkGX',
  'default': 'EXAVITQu4vr4xnSDxMaL',
};

/**
 * Splits text at sentence boundaries into chunks of max `maxLen` characters.
 */
function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('TTS request received');

    const { text, voiceId, speed } = await req.json();

    if (!text || typeof text !== 'string' || text.length === 0) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'TTS service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resolvedVoiceId = VOICE_IDS[voiceId?.toLowerCase() || ''] || voiceId || VOICE_IDS.default;
    const speechSpeed = Math.max(0.25, Math.min(4.0, speed || 1.0));

    // Cap at 5000 chars
    const cleanedText = text.slice(0, 5000);
    const chunks = splitTextIntoChunks(cleanedText, 2500);

    console.log(`TTS: voice=${resolvedVoiceId}, text_length=${cleanedText.length}, chunks=${chunks.length}, speed=${speechSpeed}`);

    const audioBuffers: ArrayBuffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const previous_text = i > 0 ? chunks[i - 1].slice(-200) : undefined;
      const next_text = i < chunks.length - 1 ? chunks[i + 1].slice(0, 200) : undefined;

      let chunkAudio: ArrayBuffer | null = null;

      // Retry up to 3 times per chunk with increasing delay
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_22050_32`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: chunk,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true,
                speed: speechSpeed,
              },
              ...(previous_text && { previous_text }),
              ...(next_text && { next_text }),
            }),
          }
        );

        console.log(`ElevenLabs chunk ${i + 1}/${chunks.length} attempt ${attempt + 1} status: ${response.status}`);

        if (response.ok) {
          chunkAudio = await response.arrayBuffer();
          break;
        }

        const errorText = await response.text();
        console.warn(`ElevenLabs attempt ${attempt + 1} error:`, response.status, errorText);

        if (attempt < 2) {
          // Wait before retry: 800ms, then 1600ms
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
        }
      }

      if (!chunkAudio) {
        console.error(`All 3 attempts failed for chunk ${i + 1}`);
        return new Response(JSON.stringify({ error: 'Text-to-speech failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      audioBuffers.push(chunkAudio);
    }

    // Concatenate all audio buffers
    const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    const base64Audio = base64Encode(combined.buffer);
    console.log(`TTS success: audio_size=${totalLength}, chunks=${chunks.length}`);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('TTS function error:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
