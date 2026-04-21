

## Fix: OpenRouter chat not responding

### Diagnosis
The edge function is correctly routing to OpenRouter — logs confirm `provider=openrouter`. However, OpenRouter returns **"API credits exhausted"** (HTTP 402). The API key `sk-or-v1-48ff7...` has no credit balance on openrouter.ai.

On top of that, the current code treats OpenRouter as the primary provider and **only falls back to Lovable AI if `OPENROUTER_API_KEY` is missing entirely**. A 402 from OpenRouter does not trigger a fallback, so the request just fails.

### What will change

**1. Top up OpenRouter (user action, outside code)**
Add credits to your OpenRouter account at openrouter.ai/credits. Without this, the key cannot make any requests regardless of what we do in code.

**2. Make fallback automatic on OpenRouter failure — `supabase/functions/chat/index.ts`**
Wrap the OpenRouter call so that on a 402/401/429 error we automatically retry the request against the Lovable AI gateway. That way if OpenRouter runs out again, chat keeps working instead of going silent.

```text
sendRequest(provider=openrouter)
  ├── 200 → stream back to client
  └── 402/401/429 → log reason → sendRequest(provider=lovable)
                                   └── stream back to client
```

**3. Surface the real error to the UI**
When both providers fail, return the actual provider error message (e.g. "OpenRouter: insufficient credits") instead of a generic 500, so you can see what's wrong in the chat instead of just a silent failure.

### Files touched
- `supabase/functions/chat/index.ts` — add try/catch around OpenRouter fetch, fallback to Lovable on 402/401/429, propagate clear error messages

### Out of scope
- No client-side changes needed
- No schema changes
- The OpenRouter key itself stays as you provided it

