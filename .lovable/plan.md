

## WiserAI Status Report: What Works vs What's Missing/Broken

### What Works

| Feature | Status | Notes |
|---------|--------|-------|
| **Landing Page** | Working | Renders correctly with branding, CTA buttons, nav links |
| **Chat (Normal Mode)** | Working | Sends messages, gets AI responses via edge function |
| **Mode Switching** | Working | 7 modes available (Conversation, Study, Quiz, Research, Game, Creative, Coding) |
| **Chat Edge Function** | Working | Multi-mode system prompt with Lovable AI gateway |
| **Sidebar** | Working | New Chat, Projects, Chat history sections render |
| **TopBar** | Working | Fixed — uses `ChatContext` safely with `useContext` (no more `require()`) |
| **AI Model Dropdown** | Removed (as planned) | `MODEL_INFO`/`AIModel` no longer referenced in ChatInput |
| **Agent Orchestrator** | Deployed | Edge function + DB tables (agent_tasks, agent_plans, agent_execution_logs, agent_schedules) |
| **ManusPanel UI** | Built | Task creation, execution, detail view with phase tracking |
| **Auth System** | Built | Sign in/up modal, session management via AuthContext |
| **Credits System** | Built | Balance tracking, transaction history, tier-based limits |
| **Gamification** | Built | XP, levels, streaks, badges |
| **Dark Theme** | Working | Consistent dark UI throughout |

### What's Broken / Has Errors

| Issue | Severity | Details |
|-------|----------|---------|
| **forwardRef warnings** | Medium | Multiple React warnings: `TooltipProvider`, `LoadingScreen`, `Toaster`, `Sonner`, `OfflineIndicator`, `InstallPrompt` — all get refs passed but don't use `forwardRef`. These are React dev warnings, not crashes, but they spam the console. |
| **`AIModel` type still exists** | Low | `src/types/chat.ts` still exports `AIModel` type and `MODEL_INFO` (lines 10-128). `ChatContext` still has `currentModel`/`setCurrentModel`. The dropdown was removed from ChatInput but the underlying types and state remain as dead code. |
| **Agent Orchestrator untested with auth** | Medium | ManusPanel requires authentication (`useAuth`), but the orchestrator edge function also requires a valid session token. Without signing in, agent tasks cannot be created or run — users see "Please sign in" but there's no clear path from the panel to auth. |

### What's Missing / Not Yet Implemented

| Feature | Priority | Details |
|---------|----------|---------|
| **Agent Schedules UI** | High | `agent_schedules` table exists but there's no UI to create, edit, pause, or delete scheduled automations |
| **Agent execution is simulated** | High | The orchestrator's `executePhase` function uses AI to "describe what it would do" but doesn't actually perform real actions (no real web search, file operations, or API calls) |
| **MCP Client Support** | Medium | No implementation — was planned but skipped per "skip external infra" decision |
| **GitHub/Google Drive integrations** | Medium | `connected_accounts` table exists, `google-oauth` edge function exists, but no actual GitHub API integration or Google Drive file sync |
| **Push Notifications (OneSignal)** | Low | `pushNotifications.ts` exists but no OneSignal integration — notifications are DB-only |
| **Admin Panel** | Low | No admin dashboard for monitoring tasks across users, viewing logs, or managing the system |
| **Accessibility Automation** | Low | No TTS/STT preference detection, no dyslexia font toggle, no high-contrast mode stored in user settings |
| **PDF/Document processing** | Partial | Edge functions exist (`pdf-processor`, `process-document`) but unclear if they're wired to the UI correctly |
| **Stripe payments** | Partial | Edge functions exist (`create-checkout`, `stripe-webhook`, etc.) and `STRIPE_SECRET_KEY` is set, but needs end-to-end verification |

### Recommended Fixes (Priority Order)

1. **Clean up dead `AIModel` code** — Remove unused types, `MODEL_INFO`, and `currentModel` state from ChatContext
2. **Fix forwardRef warnings** — Wrap `LoadingScreen`, `OfflineIndicator`, `InstallPrompt` with `forwardRef` or stop passing refs
3. **Make agent execution real** — Replace simulated "describe what it would do" with actual tool execution (HTTP requests, code generation that returns results)
4. **Build agent schedules UI** — Create/edit/pause/delete automations using the existing `agent_schedules` table
5. **Wire up integrations** — Connect GitHub API and Google Drive OAuth flows to the `connected_accounts` system

