

## Plan: Add New API Key, Remove AI Model Dropdown, Fix Errors

### 1. Remove AI Model Dropdown from ChatInput

The `ChatInput.tsx` component (lines 518-547) has a "Model Dropdown" that lets users pick AI models (GPT-4o, Claude, Gemini, etc.). This will be completely removed.

**Changes to `src/components/chat/ChatInput.tsx`:**
- Remove the Model Dropdown section (lines 518-547)
- Remove unused imports: `MODEL_INFO`, `AIModel` from `@/types/chat` (line 26)
- Remove the `models` variable (line 310)
- Remove `currentModel` and `setCurrentModel` from the `useChat()` destructuring (line 89)

### 2. Fix TopBar `useChatSafe` to Use Context Directly

The `TopBar.tsx` uses `require()` which can fail in Vite/ESM. It should use the exported `ChatContext` with `useContext` like the Sidebar does.

**Changes to `src/components/layout/TopBar.tsx`:**
- Import `ChatContext` from `@/contexts/ChatContext` and `useContext` from React
- Replace the `require`-based `useChatSafe` with a context-based version that returns defaults when outside the provider

### 3. Add API Key Management Access

The API Key management already exists at `src/components/apikeys/ApiKeyManagement.tsx` and is accessible via the Dashboard page (`/dashboard` -> "API Keys" tab). The request is to make it easier to create a new API key. We'll add a quick-access button/link in the Dashboard or ensure the flow is smooth.

Since the `ApiKeyManagement` component already has full CRUD functionality (create, view, delete API keys), no database changes are needed. The feature is already working -- we just need to ensure it's accessible without errors.

### Technical Details

**File: `src/components/chat/ChatInput.tsx`**
- Remove `MODEL_INFO, AIModel` from import on line 26
- Remove `currentModel, setCurrentModel` from useChat() on line 89
- Remove `const models = ...` on line 310
- Delete the entire Model Dropdown block (lines 518-547)

**File: `src/components/layout/TopBar.tsx`**
- Replace the `useChatSafe` function (lines 26-34) to use `ChatContext` with `useContext` instead of `require`
- Import `ChatContext` and `useContext`

### Error Prevention
- Both Sidebar and TopBar will use the same safe pattern: check if `ChatContext` is undefined and return defaults
- No `require()` calls which can break in Vite ESM builds
- The AI model selection is cleanly removed without leaving orphan references

