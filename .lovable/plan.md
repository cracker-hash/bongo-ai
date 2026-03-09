

## What's Already Built

**EdTech:**
- Chat with multi-mode system (Study, Quiz, Research, Game, Creative, Coding)
- Quiz interface with short-answer validation, hints, timer, TTS
- Document upload/processing (PDF.co)
- Pedagogy engine system prompt (misconception detection, mastery locks)
- Gamification (XP, streaks, badges, levels)

**Automation (Manus-style):**
- Agent orchestrator with real tool execution (web search, code gen, HTTP, summarize, data analysis)
- Multi-phase planning with AI-generated plans and auto-revision on failure
- ManusPanel UI with task creation, phase tracking, execution logs
- Scheduled automations via pg_cron + agent_schedules table
- Realtime updates via Supabase channels

## What's Missing — Gaps to Close

### 1. EdTech: Flashcard System
Add a spaced-repetition flashcard mode. Users say "create flashcards on [topic]" or generate them from uploaded documents. Persist to a new `flashcards` table with `next_review_at`, `ease_factor`, `interval` columns for SM-2 algorithm.

- New DB table: `flashcards` (user_id, front, back, deck, ease_factor, interval, next_review_at, review_count)
- New component: `src/components/flashcards/FlashcardReview.tsx` — card flip animation, rate difficulty (Again/Hard/Good/Easy)
- Integrate into ChatContext: detect "flashcard" intent, generate cards via AI, save to DB
- Add "Flashcards" as a learning mode card on WelcomeScreen

### 2. EdTech: Progress Dashboard / Knowledge Map
A visual learning progress tracker showing mastery per topic. Currently gamification only tracks XP/streaks — no topic-level mastery.

- New DB table: `learning_progress` (user_id, topic, mastery_level, last_studied, quiz_scores jsonb)
- New component: `src/components/learning/ProgressMap.tsx` — grid/tree of topics with 🟢🟡🔴 mastery indicators
- Update quiz completion handler to write topic mastery data
- Accessible from sidebar or dashboard

### 3. EdTech: Study Plan Generator
The WelcomeScreen has a "Study Plan" quick action in ManusPanel but no dedicated study plan UI. Add structured study plan generation with daily tasks, deadlines, and progress tracking.

- Extend `agent_tasks` to support study plan type or create `study_plans` table
- New component: `src/components/learning/StudyPlanView.tsx` — timeline of daily tasks with checkboxes
- Chat integration: "create a study plan for [subject]" generates and persists a plan

### 4. Automation: Agent Memory / Context Persistence
The agent orchestrator currently has no memory between tasks. For Manus-level capability, agents need persistent context.

- New DB table: `agent_memory` (user_id, key, value jsonb, category, created_at, updated_at)
- Update `agent-orchestrator` to load relevant memory before planning and save insights after completion
- Enables agents to reference past research, preferences, and accumulated knowledge

### 5. Automation: Multi-Step Workflow Templates
Users should be able to save and reuse complex workflows (not just schedules). E.g., "Research → Summarize → Draft Email" as a reusable template.

- New DB table: `workflow_templates` (user_id, name, description, steps jsonb, is_public)
- New UI in ManusPanel: "Templates" tab to browse, create, and run saved workflows
- One-click execution that creates and runs an agent task from the template

### 6. Automation: Real Web Browsing Tool
Current `toolWebSearch` simulates search via AI — it doesn't actually browse the web. For Manus-level autonomy, add real web fetching.

- Update `toolHttpRequest` in agent-orchestrator to parse HTML, extract main content (strip tags, get text)
- Add a `tool_scrape_and_summarize` that fetches a URL, extracts content, then summarizes via AI
- This gives the agent real web interaction capability

### 7. Fix: Landing Page Routes to `/` but Chat is at `/chat`
The user lands on `/` (Landing page) but chat/EdTech features are at `/chat`. For an EdTech product, authenticated users should go straight to `/chat`.

- Update Landing page to auto-redirect authenticated users to `/chat`

## Priority Order

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Flashcard System | Medium | High — core EdTech feature |
| 2 | Progress Dashboard | Medium | High — retention & motivation |
| 3 | Agent Memory | Small | High — Manus-level capability |
| 4 | Study Plan Generator | Medium | Medium — structured learning |
| 5 | Workflow Templates | Medium | Medium — automation reuse |
| 6 | Real Web Browsing | Small | Medium — agent capability |
| 7 | Auth Redirect | Tiny | Small — UX polish |

## Technical Summary

- 3 new DB tables: `flashcards`, `learning_progress`, `agent_memory`
- 1 optional table: `workflow_templates`
- 3 new UI components (FlashcardReview, ProgressMap, StudyPlanView)
- Updates to agent-orchestrator for memory load/save
- Updates to ChatContext for flashcard intent detection
- Landing page redirect for authenticated users

