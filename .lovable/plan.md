

## Plan: Fix Remaining Issues

### Issue 1: agent-orchestrator "Authentication failed"
The function uses `authClient.auth.getClaims(token)` (line 247) which **does not exist** on the Supabase JS client. The `chat` function correctly uses `getUser(token)` — same pattern needed here.

**Fix `supabase/functions/agent-orchestrator/index.ts` (line 247-249):**
Replace `getClaims` with `getUser(token)`, matching the working pattern in the chat function:
```typescript
const { data: userData, error: userError } = await authClient.auth.getUser(token);
if (userError || !userData?.user) throw new Error("Authentication failed");
const userId = userData.user.id;
```

### Issue 2: No other blocking issues found
- TopBar `useChatSafe` — already fixed with proper `ChatContext` pattern
- WelcomeScreen — EdTech learning mode cards already added
- process-document — CORS and Lovable AI gateway already fixed
- ChatContext — quiz intent detection already added
- ChatContainer — credit deduction already in place

### Summary
Single fix: replace non-existent `getClaims()` with working `getUser(token)` in agent-orchestrator.

