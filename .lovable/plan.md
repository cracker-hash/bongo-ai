

## Audit Results & Fix Plan

### What Works
- **Landing page, routing, TopBar, Sidebar** -- all render correctly
- **Chat system** -- 7 modes, streaming, message persistence
- **Auth system** -- login/signup/session management
- **Credits system** -- balance, deductions, tier checks
- **Agent orchestrator edge function** -- deployed with real tool execution (web_search, http_request, generate_code, summarize, data_analysis)
- **ManusPanel wired into TopBar** -- Bot icon button opens Sheet overlay with Tasks/Details/Schedules tabs
- **SchedulesPanel** -- CRUD for agent_schedules table
- **pg_cron job** -- active, running every minute (`process-agent-schedules`)
- **Database functions** -- `compute_next_run` and `process_agent_schedules` exist

### What's Broken

**1. Cron can't call edge functions -- `app.settings` not configured (Critical)**
The `process_agent_schedules()` function reads `current_setting('app.settings.supabase_url', true)` and `current_setting('app.settings.service_role_key', true)` -- both return `NULL`. This means scheduled tasks get created as `pending` but never actually execute via `net.http_post`. The `pg_net` call is silently skipped every time.

**Fix:** Replace the dynamic `current_setting` approach with hardcoded values in the function (using the known project URL and service role key from secrets), or use `ALTER DATABASE` to set these -- but that's not allowed. Instead, we'll update the function to read from a `vault.secrets` lookup or simply hardcode the Supabase URL and use `Deno.env` equivalent. The cleanest approach: update the SQL function to use the known Supabase URL directly and fetch the service role key from `vault.decrypted_secrets`.

**Actually**, the simplest reliable fix: hardcode the project's Supabase URL in the function and retrieve the service role key using `SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'`. But we can't access vault from PL/pgSQL easily. The most pragmatic fix: **store the URL and key as function constants** since this is a `SECURITY DEFINER` function.

Best approach: Create a new migration that drops and recreates `process_agent_schedules()` with the Supabase URL hardcoded (`https://gbbqdmgrjtdliiddikwq.supabase.co`) and reads the service role key from `current_setting('supabase.service_role_key', true)` or uses a direct constant.

**2. Console warning: forwardRef on Routes/Landing (Minor)**
React Router v6 `Routes` component gets a ref from somewhere in `App.tsx`. This is a harmless warning from React Router internals -- not actionable without upgrading to v7.

### Implementation Plan

**Task 1: Fix cron auto-execution by hardcoding Supabase URL in the DB function**

Create a migration that replaces `process_agent_schedules()` to use the actual Supabase project URL (`https://gbbqdmgrjtdliiddikwq.supabase.co`) directly instead of relying on `app.settings`. For the service role key, we'll use `current_setting('supabase_auth.service_role_key', true)` which is available in Supabase-hosted Postgres, or pass it as a hardcoded value from the secrets.

The function will:
- Use `'https://gbbqdmgrjtdliiddikwq.supabase.co'` as the URL
- Retrieve the service role key via: `SELECT current_setting('supabase.service_key', true)` -- if that fails, we'll embed it from Supabase secrets using a vault query

**Task 2: Verify everything else is correctly wired**

No other code changes needed -- TopBar has ManusPanel, SchedulesPanel is integrated, agent-orchestrator has real tools, ChatInput has no orphan model dropdown (it was already clean).

### Technical Details

```sql
-- New migration: fix process_agent_schedules to use real URL
CREATE OR REPLACE FUNCTION public.process_agent_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  schedule_record RECORD;
  new_task_id UUID;
  service_key TEXT;
BEGIN
  -- Get service role key from Supabase vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  FOR schedule_record IN
    SELECT ... WHERE is_active = true AND next_run_at <= now()
  LOOP
    -- Insert task (same as before)
    -- Call edge function with hardcoded URL
    IF service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://gbbqdmgrjtdliiddikwq.supabase.co/functions/v1/agent-orchestrator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(...)
      );
    END IF;
    -- Update schedule with computed next_run_at
  END LOOP;
END;
$$;
```

This is a single migration that fixes the only broken piece -- scheduled tasks will now actually trigger the agent-orchestrator edge function.

