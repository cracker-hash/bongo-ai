import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ElevenLabs voice IDs - includes voices good for Swahili/African languages
const VOICE_IDS: Record<string, string> = {
  // Standard voices
  'rachel': 'EXAVITQu4vr4xnSDxMaL', // Sarah - clear female
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
  // Default
  'default': 'EXAVITQu4vr4xnSDxMaL',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, speed } = await req.json();
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Get voice ID from mapping or use directly
    const resolvedVoiceId = VOICE_IDS[voiceId?.toLowerCase()] || voiceId || VOICE_IDS.default;
    
    // Calculate speech speed (ElevenLabs uses 0.25-4.0 range, default 1.0)
    const speechSpeed = Math.max(0.25, Math.min(4.0, speed || 1.0));

    console.log(`TTS request: voice=${resolvedVoiceId}, speed=${speechSpeed}, text length=${text.length}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2', // Best for Swahili and other languages
          output_format: 'mp3_44100_128',
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Convert to base64 for safe transport
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('TTS function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'TTS failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
