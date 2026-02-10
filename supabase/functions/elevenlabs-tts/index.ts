import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VOICE_IDS: Record<string, string> = {
  'rachel': 'EXAVITQu4vr4xnSDxMaL',
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

    console.log(`TTS: voice=${resolvedVoiceId}, text_length=${text.length}, speed=${speechSpeed}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 2000),
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: speechSpeed,
          },
        }),
      }
    );

    console.log(`ElevenLabs response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Text-to-speech failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`TTS success: audio_size=${audioBuffer.byteLength}`);

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
