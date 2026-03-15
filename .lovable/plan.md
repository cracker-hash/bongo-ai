

## Plan: Fix TTS One-Click Playback and Voice Switching

### Root Cause
The edge function logs show ElevenLabs returning **401 "detected_unusual_activity"** errors intermittently — their free tier rate-limits aggressively. The current code has **no retry or fallback**, so it just throws "Text-to-speech failed" on the first attempt. The 5th click works because ElevenLabs occasionally lets a request through.

### Fix Strategy

**1. Add automatic fallback in `src/lib/textToSpeech.ts`**
- When `speakWithElevenLabs` fails (any error), **immediately retry once**
- If retry also fails, **auto-fallback to Web Speech API** so the user always hears speech on first click
- Show a subtle toast saying "Using browser voice" so user knows it fell back

**2. Fix voice ID mapping**
- `rachel` and `sarah` currently map to the **same** ElevenLabs voice ID (`EXAVITQu4vr4xnSDxMaL`). Fix `rachel` to use her correct ID (`21m00Tcm4TlvDq8ikWAM`)
- Ensure all 12 voices in `ELEVENLABS_VOICES` list have unique, correct IDs

**3. Same fix in the edge function `supabase/functions/elevenlabs-tts/index.ts`**
- Fix the duplicate `rachel`/`sarah` voice ID mapping to match

**4. Ensure instant start**
- The `onStart` callback already fires correctly — the fallback ensures it always fires on first click instead of erroring out

### Files Changed
- `src/lib/textToSpeech.ts` — Add retry + Web Speech fallback in `speakWithElevenLabs`, fix rachel voice ID
- `supabase/functions/elevenlabs-tts/index.ts` — Fix rachel voice ID

### No database changes needed.

