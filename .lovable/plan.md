

## Plan: Production-Ready API Gateway with Security & Working Endpoints

### Problem
The current setup has API keys stored in a `api_keys` table and a documentation page, but:
1. **No API key authentication** -- the `chat` edge function doesn't validate user-generated API keys (`wsr_*`), only Supabase auth tokens
2. **Endpoints in docs are fake** -- they reference `api.wiser.ai/v1` which doesn't exist; the real functions are edge functions
3. **No rate limiting or usage tracking** per API key
4. **No dedicated API gateway** edge function that routes external requests using API keys

### Approach
Create a single **`api-gateway`** edge function that acts as the public API entry point. External users authenticate with their `wsr_*` API key, and the gateway validates it, enforces rate limits, logs usage, deducts credits, then proxies to the internal edge functions.

### Changes

**1. New edge function: `supabase/functions/api-gateway/index.ts`**
- Accepts requests at paths like `/chat/completions`, `/images/generate`, `/audio/tts`, `/documents/analyze`, `/podcast/generate`
- Validates the `Authorization: Bearer wsr_*` API key against the `api_keys` table (must be active)
- Looks up the key's `user_id` to get their `user_credits` balance
- Enforces per-key rate limiting (in-memory + `requests_count` column)
- Deducts credits based on endpoint (chat=1, image=50, tts=5, podcast=20, document=10)
- Logs to `usage_logs` table with the `api_key_id`
- Updates `last_used_at` and `requests_count` on the API key
- Proxies the actual work to internal functions (chat, freepik-ai, elevenlabs-tts, generate-podcast, process-document)
- Returns OpenAI-compatible response format for chat completions
- Proper error responses with status codes (401, 403, 429, 500)

**2. Database migration: Add `rate_limit` and `permissions` columns to `api_keys`**
```sql
ALTER TABLE public.api_keys 
  ADD COLUMN IF NOT EXISTS rate_limit integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT ARRAY['chat']::text[];
```

**3. Update `supabase/config.toml`** -- add `[functions.api-gateway]` with `verify_jwt = false`

**4. Update `src/pages/ApiDocs.tsx`** -- replace fake `api.wiser.ai/v1` URLs with real gateway URL, update code examples

**5. Update `src/components/apikeys/ApiKeyManagement.tsx`** -- add permission toggles (chat, images, tts, podcast, documents) when creating keys; show usage stats

### API Gateway Endpoint Routing

```text
POST /api-gateway
  Header: Authorization: Bearer wsr_xxxxx
  Body: { "endpoint": "chat/completions", ...params }

Alternatively, use query param:
  POST /api-gateway?path=chat/completions
```

Each endpoint maps to an internal function:

| API Path | Internal Function | Credit Cost |
|----------|------------------|-------------|
| `chat/completions` | chat (inline) | 1 |
| `images/generate` | freepik-ai | 50 |
| `audio/tts` | elevenlabs-tts | 5 |
| `podcast/generate` | generate-podcast | 20 |
| `documents/analyze` | process-document | 10 |
| `automation/execute` | manus-automation | 10 |

### Security Measures
- API key validated server-side against DB on every request
- Keys are hashed comparison (exact match from `api_keys.api_key`)
- Inactive keys rejected immediately
- Credit balance checked before processing
- Rate limiting per key (configurable per key)
- Usage logged with timestamps for audit
- CORS headers for browser-based usage
- Input validation with Zod on all endpoints

### Files Modified/Created
| File | Action |
|------|--------|
| `supabase/functions/api-gateway/index.ts` | Create -- main gateway |
| `supabase/config.toml` | Add gateway config |
| `src/pages/ApiDocs.tsx` | Update URLs and examples |
| `src/components/apikeys/ApiKeyManagement.tsx` | Add permissions UI |
| DB migration | Add columns to `api_keys` |

