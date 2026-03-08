

## Plan: Fix & Complete EdTech Features

### Issues Found

1. **process-document CORS blocks preview URLs** — The allowed origins list is hardcoded and doesn't include Lovable preview URLs (`id-preview--*.lovable.app`), causing CORS failures in the current preview environment.

2. **process-document doesn't use Lovable AI gateway** — The chat function correctly prioritizes `LOVABLE_API_KEY` → OpenRouter → OpenAI, but `process-document` only tries OpenRouter → OpenAI. This means it may fail if only the Lovable key is configured.

3. **WelcomeScreen has no EdTech prompts** — The welcome screen shows tool buttons (slides, website, apps, design) but none of the 7 learning modes (Study, Quiz, Research, Game, Coding, Creative). Users have no visible way to discover EdTech features from the home screen.

4. **Quiz mode requires document upload** — There's no way to start a topic-based quiz without uploading a PDF. Users should be able to type "Quiz me on photosynthesis" and get questions.

5. **No credit deduction for document processing** — Study and Quiz document analysis calls the edge function but never deducts credits.

### Changes

**1. Fix `supabase/functions/process-document/index.ts`**
- Replace restricted CORS with `'Access-Control-Allow-Origin': '*'` (matching the chat function pattern) and add the full required headers list
- Add Lovable AI gateway as primary provider (same pattern as chat function): LOVABLE_API_KEY → OpenRouter → OpenAI

**2. Update `src/components/chat/WelcomeScreen.tsx`**
- Add an EdTech quick-start section below the tool buttons with mode cards for: Study, Quiz, Research, Game, Coding
- Each card triggers `onPromptClick` with a starter prompt and the correct mode
- Example prompts: "Help me study calculus", "Quiz me on world history", "Research quantum computing", "Play a logic game", "Teach me Python"

**3. Add topic-based quiz in `src/contexts/ChatContext.tsx`**
- Detect quiz-intent messages (e.g., "quiz me on X") and set mode to quiz automatically
- For topic-based quizzes (no document), send the request to the chat function in quiz mode instead of requiring document upload — the chat function already has a rich quiz system prompt

**4. Add credit deduction for document processing in `src/components/chat/ChatContainer.tsx`**
- Before calling `processDocumentForQuiz` or `processDocumentForStudy`, check and deduct credits (10 credits for document analysis, matching the API gateway config)

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/process-document/index.ts` | Fix CORS to `*`, add Lovable AI gateway as primary provider |
| `src/components/chat/WelcomeScreen.tsx` | Add EdTech mode cards section |
| `src/components/chat/ChatContainer.tsx` | Add credit deduction for document processing |
| `src/contexts/ChatContext.tsx` | Auto-detect quiz intent and route to quiz mode |

