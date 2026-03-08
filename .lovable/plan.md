

## Plan: Fix and Improve Audio Features (Podcast, Voice Chat, TTS, STT)

### Issues Identified

**1. CORS mismatch on `elevenlabs-studio` edge function**
The `elevenlabs-studio` function has a restrictive CORS `Access-Control-Allow-Headers` that is missing the newer Supabase client headers (`x-supabase-client-platform`, etc.). This causes preflight failures when calling it from `supabase.functions.invoke()`.

**2. Voice Conversation uses anon key instead of user token**
`VoiceConversation.tsx` sends the anon key as the `Authorization` header instead of the user's auth token. This means the chat edge function cannot identify the user, and will fail if the function requires authentication.

**3. Speech recognition `continuous: false` causes single-shot capture**
`speechToText.ts` sets `continuous = false`, meaning it stops after one result. For voice conversation, this causes premature cutoffs -- the user has to re-trigger listening after every phrase.

**4. TTS text truncated to 2000 chars**
The `elevenlabs-tts` edge function hard-caps text at 2000 characters (`text.slice(0, 2000)`). Longer AI responses get cut off mid-sentence during playback.

**5. Podcast "silence" injection is raw zeros, not valid MP3**
In `elevenlabs-studio`, the pause between speakers is `new Uint8Array(300 * 16)` -- raw zero bytes injected into the MP3 stream. This corrupts playback and causes audio glitches.

**6. No loading/error feedback during TTS on chat bubbles**
The `isLoadingTTS` state exists in `ChatBubble` but there is no visual indicator while waiting for the ElevenLabs API response.

### Changes

| File | Fix |
|------|-----|
| `supabase/functions/elevenlabs-studio/index.ts` | Update CORS headers to match standard pattern |
| `src/components/chat/VoiceConversation.tsx` | Use authenticated user token from `supabase.auth.getSession()` instead of anon key; add error handling for expired JWT |
| `src/lib/speechToText.ts` | Add `continuous` mode option for voice conversation; increase silence timeout |
| `supabase/functions/elevenlabs-tts/index.ts` | Increase text limit to 5000 chars; chunk long text with request stitching |
| `supabase/functions/elevenlabs-studio/index.ts` | Remove fake silence injection between speakers (just concatenate MP3 chunks directly) |
| `src/components/chat/ChatBubble.tsx` | Add spinner indicator when TTS is loading; show error toast on failure |
| `src/components/chat/VoiceConversation.tsx` | Improve UI: show waveform animation while speaking, add conversation history scroll, better error recovery |

### Technical Details

**CORS fix** -- Update `elevenlabs-studio` headers to:
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

**Voice auth fix** -- Replace hardcoded anon key auth with:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
// Use token in Authorization header
```

**TTS chunking** -- For text > 2500 chars, split at sentence boundaries and use `previous_text`/`next_text` for request stitching, then concatenate the audio buffers.

**Silence removal** -- Simply concatenate MP3 buffers directly without injecting zero-byte silence (ElevenLabs already adds natural pauses at sentence boundaries).

**STT continuous mode** -- Add an option to `startSpeechRecognition` for `continuous: true` and auto-restart on end for the voice conversation flow.

