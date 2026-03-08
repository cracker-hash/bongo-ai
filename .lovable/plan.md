

## Plan: AI-Powered Builder Panel (Preview + Code + GitHub Export)

### Overview

When a user clicks "Build website" or "Develop apps" (or sends a coding prompt), a split panel opens alongside the chat showing a **live preview iframe** and a **source code editor**. The AI generates HTML/CSS/JS code via the existing chat edge function, which renders in the preview. Users can iterate via chat, view/edit the source, and export to GitHub.

### Architecture

```text
┌─────────────────────────────────────────────────────┐
│ Chat (left)              │ Builder Panel (right)     │
│                          │ ┌───────────────────────┐ │
│ User: "Build a landing   │ │ [Preview] [Code] [⚙]  │ │
│ page for my startup"     │ │                       │ │
│                          │ │  ┌─────────────────┐  │ │
│ AI: "Here's your page…"  │ │  │  Live Preview   │  │ │
│                          │ │  │  (sandboxed      │  │ │
│ User: "Add a CTA button" │ │  │   iframe)        │  │ │
│                          │ │  └─────────────────┘  │ │
│                          │ │  [Export to GitHub]    │ │
│                          │ └───────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Components

**1. BuilderPanel component** (`src/components/builder/BuilderPanel.tsx`)
- Split view with tabs: Preview | Code
- Preview: sandboxed `<iframe srcDoc={generatedCode}>` with responsive viewport controls (desktop/tablet/mobile)
- Code: syntax-highlighted editor using `react-syntax-highlighter` (already installed) with copy button. For editing, a simple `<textarea>` with monospace font overlaid (no need for Monaco -- keeps bundle small)
- Toolbar: viewport size toggles, refresh preview, export to GitHub button, download as ZIP

**2. Code extraction from AI responses**
- Update `ChatContext` to detect when AI returns code blocks (```html, ```css, ```js) in coding/website/apps mode
- Parse and combine into a single HTML document, store in a `builderCode` state
- Auto-update the preview iframe whenever `builderCode` changes

**3. Builder state management**
- Add to `ChatContext`: `builderCode: string | null`, `builderOpen: boolean`, `setBuilderCode`, `setBuilderOpen`
- When user clicks "Build website" or "Develop apps", set mode to `coding` and open the builder panel
- Each AI response in coding mode auto-extracts code and updates the preview

**4. GitHub Export** (`src/components/builder/GithubExportDialog.tsx`)
- Dialog with repo name input + public/private toggle
- Calls a new `github-export` edge function that:
  - Uses the user's GitHub OAuth token from `connected_accounts` table
  - Creates a repo via GitHub API (`POST /user/repos`)
  - Creates files via GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`)
  - Commits index.html, style.css, script.js, and a README
- If no GitHub account connected, prompts user to connect via `/connected-accounts`

**5. Layout integration**
- Modify `ChatContainer` to use `react-resizable-panels` (already installed) for a resizable split between chat and builder panel
- Builder panel slides in from the right when `builderOpen` is true
- On mobile: builder is full-screen with a back button to chat

### Database

**New table: `builder_projects`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text)
- `html_code` (text) -- the generated HTML
- `css_code` (text)
- `js_code` (text)
- `created_at`, `updated_at`
- RLS: users can only CRUD their own rows

### Edge Function: `github-export`
- Accepts: `{ repoName, isPrivate, files: [{path, content}] }`
- Reads GitHub token from `connected_accounts` for the authenticated user
- Creates repo + commits files via GitHub REST API
- Returns repo URL

### Files to Create/Edit

| File | Action |
|------|--------|
| `src/components/builder/BuilderPanel.tsx` | New -- preview iframe + code viewer + toolbar |
| `src/components/builder/GithubExportDialog.tsx` | New -- repo creation dialog |
| `src/components/builder/PreviewFrame.tsx` | New -- sandboxed iframe with viewport controls |
| `src/components/builder/CodeEditor.tsx` | New -- syntax-highlighted code view + edit |
| `src/contexts/ChatContext.tsx` | Edit -- add `builderCode`, `builderOpen` state + code extraction logic |
| `src/components/chat/ChatContainer.tsx` | Edit -- add resizable split layout with BuilderPanel |
| `src/components/chat/WelcomeScreen.tsx` | Edit -- wire "Build website" / "Develop apps" to open builder |
| `supabase/functions/github-export/index.ts` | New -- GitHub repo creation + file commit |
| DB migration | New -- `builder_projects` table with RLS |

### Implementation Order

1. Create `builder_projects` table via migration
2. Build `BuilderPanel`, `PreviewFrame`, `CodeEditor` components
3. Update `ChatContext` with builder state + code extraction from AI responses
4. Update `ChatContainer` with resizable split layout
5. Wire WelcomeScreen tool buttons to open builder
6. Build `GithubExportDialog` + `github-export` edge function
7. Add download-as-ZIP fallback (no GitHub needed)

