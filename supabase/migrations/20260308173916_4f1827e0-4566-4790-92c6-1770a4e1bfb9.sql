
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
    SELECT s.id, s.user_id, s.task_template, s.cron_expression, s.name
    FROM public.agent_schedules s
    WHERE s.is_active = true
      AND (s.next_run_at IS NULL OR s.next_run_at <= now())
  LOOP
    -- Create an agent task
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
    ) RETURNING id INTO new_task_id;

    -- Auto-execute via pg_net with hardcoded URL and vault secret
    IF service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://gbbqdmgrjtdliiddikwq.supabase.co/functions/v1/agent-orchestrator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'action', 'run_task',
          'taskId', new_task_id::text,
          'userId', schedule_record.user_id::text
        )
      );
    END IF;

    -- Update the schedule with computed next_run_at
    UPDATE public.agent_schedules
    SET 
      last_run_at = now(),
      run_count = run_count + 1,
      next_run_at = now() + public.compute_next_run(schedule_record.cron_expression),
      updated_at = now()
    WHERE id = schedule_record.id;
  END LOOP;
END;
$$;
