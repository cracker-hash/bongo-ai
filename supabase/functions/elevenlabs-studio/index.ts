import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ElevenLabs voices for podcast
const VOICES = {
  host: '6lCwbsX1yVjD49QmpkTR', // Host voice
  guest: 'bYTqZQo3Jz7LQtmGTgwi', // Guest voice
  narrator: 'onwK4e9ZLuTAKqWW03F9', // Daniel - narrator
  professional: 'CwhRBWXzGAHq8TQ4Fs17', // Roger - professional
  engaging: 'JBFqnCBsd6RMkjVDRZzb', // George - engaging
  female: 'EXAVITQu4vr4xnSDxMaL', // Sarah - female
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, text, title, mode, hostVoice, guestVoice, url, sourceType } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const headers = {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'create-podcast': {
        // ElevenLabs Podcast Studio with conversation mode
        console.log('Creating podcast with ElevenLabs Studio:', title);
        
        // First, generate a conversation script using OpenAI
        if (!OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required for script generation');
        }

        const scriptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a podcast script writer. Create a natural two-person conversation podcast script.

FORMAT STRICTLY AS:
HOST: [host dialogue]
GUEST: [guest dialogue]
HOST: [host dialogue]
...

Guidelines:
- Start with the host introducing the topic and guest
- Make it sound like a natural conversation with back-and-forth
- Include insights, questions, and engaging discussion
- Host asks questions, Guest provides expertise
- Keep each turn 2-4 sentences for natural pacing
- End with the host summarizing key takeaways
- Aim for 5-10 exchanges total`
              },
              {
                role: 'user',
                content: `Create a podcast conversation about: "${title}"\n\nContent to discuss:\n${text.slice(0, 6000)}`
              }
            ],
            temperature: 0.8,
            max_tokens: 2500,
          }),
        });

        if (!scriptResponse.ok) {
          throw new Error('Failed to generate podcast script');
        }

        const scriptData = await scriptResponse.json();
        const conversationScript = scriptData.choices[0]?.message?.content;
        
        if (!conversationScript) {
          throw new Error('No script generated');
        }

        console.log('Script generated, length:', conversationScript.length);

        // Parse the script into speaker turns
        const turns: { speaker: 'host' | 'guest'; text: string }[] = [];
        const lines = conversationScript.split('\n').filter((line: string) => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('HOST:')) {
            turns.push({ speaker: 'host', text: line.replace('HOST:', '').trim() });
          } else if (line.startsWith('GUEST:')) {
            turns.push({ speaker: 'guest', text: line.replace('GUEST:', '').trim() });
          }
        }

        console.log(`Processing ${turns.length} conversation turns`);

        // Generate audio for each turn
        const audioBuffers: ArrayBuffer[] = [];
        const hostVoiceId = VOICES[hostVoice as keyof typeof VOICES] || VOICES.host;
        const guestVoiceId = VOICES[guestVoice as keyof typeof VOICES] || VOICES.guest;

        for (let i = 0; i < turns.length; i++) {
          const turn = turns[i];
          const voiceId = turn.speaker === 'host' ? hostVoiceId : guestVoiceId;
          
          console.log(`Processing turn ${i + 1}/${turns.length} (${turn.speaker})`);

          const audioResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                text: turn.text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                  stability: 0.65,
                  similarity_boost: 0.75,
                  style: 0.3,
                  use_speaker_boost: true,
                },
              }),
            }
          );

          if (!audioResponse.ok) {
            console.error(`Failed to generate audio for turn ${i + 1}`);
            continue;
          }

          audioBuffers.push(await audioResponse.arrayBuffer());
          
          // Add small pause between speakers
          if (i < turns.length - 1) {
            // 300ms of silence (MP3 compatible)
            const silenceBuffer = new Uint8Array(300 * 16).buffer;
            audioBuffers.push(silenceBuffer);
          }
        }

        // Combine all audio buffers
        const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
        const combinedBuffer = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const buffer of audioBuffers) {
          combinedBuffer.set(new Uint8Array(buffer), offset);
          offset += buffer.byteLength;
        }

        const base64Audio = base64Encode(combinedBuffer.buffer);

        result = {
          type: 'podcast-created',
          audioContent: base64Audio,
          script: conversationScript,
          title,
          duration: Math.round(totalLength / (16000 * 2)), // Rough estimate
          message: 'Podcast created successfully!',
        };
        break;
      }

      case 'voice-to-voice': {
        // Voice Changer - convert one voice to another
        console.log('Voice to voice conversion');
        
        // This requires audio input - not supported via text
        throw new Error('Voice-to-voice requires audio input. Please use the voice recording feature.');
      }

      case 'sound-effect': {
        // Generate sound effects
        console.log('Generating sound effect:', text);
        
        const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            duration_seconds: 5,
            prompt_influence: 0.3,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Sound effect error:', errorText);
          throw new Error('Failed to generate sound effect');
        }

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = base64Encode(audioBuffer);

        result = {
          type: 'sound-effect',
          audioContent: base64Audio,
          message: 'Sound effect generated!',
        };
        break;
      }

      case 'text-to-speech': {
        // Standard TTS with voice selection
        console.log('Text to speech:', text?.slice(0, 50));
        
        const voiceId = VOICES[hostVoice as keyof typeof VOICES] || VOICES.narrator;
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.2,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to generate speech');
        }

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = base64Encode(audioBuffer);

        result = {
          type: 'text-to-speech',
          audioContent: base64Audio,
          message: 'Speech generated!',
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ElevenLabs Studio error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
