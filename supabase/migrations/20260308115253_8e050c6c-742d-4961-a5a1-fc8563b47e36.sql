
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to process due schedules by calling the agent-orchestrator edge function
CREATE OR REPLACE FUNCTION public.process_agent_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schedule_record RECORD;
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.anon_key', true);

  FOR schedule_record IN
    SELECT s.id, s.user_id, s.task_template, s.cron_expression, s.name
    FROM public.agent_schedules s
    WHERE s.is_active = true
      AND (s.next_run_at IS NULL OR s.next_run_at <= now())
  LOOP
    -- Create an agent task directly in the database
    INSERT INTO public.agent_tasks (
      user_id, title, description, capability, context, status
    ) VALUES (
      schedule_record.user_id,
      'Scheduled: ' || schedule_record.name,
      (schedule_record.task_template->>'input'),
      COALESCE(schedule_record.task_template->>'capability', 'general'),
      jsonb_build_object(
        'original_input', schedule_record.task_template->>'input',
        'scheduled', true,
        'schedule_id', schedule_record.id
      ),
      'pending'
    );

    -- Update the schedule's last_run_at, run_count, and next_run_at
    UPDATE public.agent_schedules
    SET 
      last_run_at = now(),
      run_count = run_count + 1,
      next_run_at = now() + INTERVAL '1 hour', -- approximate; real cron handles timing
      updated_at = now()
    WHERE id = schedule_record.id;
  END LOOP;
END;
$$;
