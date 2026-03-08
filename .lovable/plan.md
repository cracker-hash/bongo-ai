

## Plan: Fix Connectors & Images

### Current State

**Images**: The full pipeline exists -- `generateImage()` in `streamChat.ts` calls the `chat` edge function, which uses Freepik Mystic API. Images auto-save to `generated_images` table. Gallery page at `/gallery` works. The `FREEPIK_API_KEY` secret is configured. **However**, the table has zero rows, suggesting either no one has tested it or the Freepik API is failing silently. The image gen flow itself is correctly wired end-to-end in code.

**Connectors**: The WelcomeScreen connector modal (Apps/Custom API/MCP tabs) is entirely static UI -- clicking any connector button does nothing. The `ConnectedAccounts` page (`/connected-accounts`) has real Google OAuth integration via the `google-oauth` edge function, but the WelcomeScreen modal doesn't link to it. The "More" tools dropdown items also do nothing on click (they just close the popover).

### What Needs Fixing

**1. Connectors modal buttons are non-functional**
Every connector button in the WelcomeScreen modal is a dead `<button>` with no `onClick`. We need to:
- Wire the "My Browser", "Gmail", "Google Drive" buttons to navigate to `/connected-accounts` or trigger the OAuth flow
- Wire "Slack" and "Notion" to show a "coming soon" toast
- Wire the "Connect" button on the featured browser connector
- Wire the "Add custom API" button to show a toast or open a dialog

**2. "More" tools dropdown items are non-functional**
Each item in the "More" popover (`Schedule task`, `Wide Research`, `Spreadsheet`, etc.) just closes the popover without doing anything. We need to:
- "Schedule task" → open the ManusPanel (agent schedules)
- "Wide Research" → send a prompt with research mode hint
- "Chat mode" → switch to conversation mode
- Others (Spreadsheet, Visualization, Video, Audio, Playbook) → send appropriate prompts to the chat

**3. Image generation gallery link missing from sidebar/nav**
The Gallery page exists at `/gallery` but there's no visible nav link to reach it (users have to know the URL). We should add a Gallery link in the Sidebar.

### Implementation Details

**File: `src/components/chat/WelcomeScreen.tsx`**
- Add `useNavigate` from react-router-dom
- Add `onClick` handlers to connector buttons: Gmail/Google Drive → `navigate('/connected-accounts')`, others → toast "Coming soon"
- Add `onClick` handlers to "More" tools: map each to a prompt submission or navigation action
- Pass through the necessary callbacks (e.g., `onPromptClick` for tools that should send prompts)

**File: `src/components/layout/Sidebar.tsx`**
- Add a Gallery link (Image icon) to the sidebar navigation, linking to `/gallery`

**No database changes needed** -- all tables and edge functions already exist and are correctly wired.

### Summary of Changes

| Item | Fix |
|------|-----|
| Connector buttons (Apps tab) | Gmail/Drive → navigate to `/connected-accounts`; others → "Coming soon" toast |
| Featured "My Browser" Connect | Toast "Coming soon" |
| "Add custom API" button | Toast "Coming soon" |
| "Add MCP Connection" button | Toast "Coming soon" |
| "More" → Schedule task | Open ManusPanel sheet |
| "More" → Wide Research | Send research prompt via `onPromptClick` |
| "More" → Chat mode | Send conversation prompt |
| "More" → Others | Send contextual prompts |
| Gallery nav link | Add to Sidebar |

