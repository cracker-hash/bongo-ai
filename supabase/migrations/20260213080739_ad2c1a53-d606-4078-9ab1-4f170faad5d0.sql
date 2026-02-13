
-- Agent Tasks table: stores autonomous task state
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planning', 'executing', 'paused', 'completed', 'failed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  capability text NOT NULL DEFAULT 'general' CHECK (capability IN ('general', 'data_analysis', 'web_development', 'tutoring', 'accessibility', 'automation', 'presentation', 'integration', 'research', 'coding')),
  context jsonb DEFAULT '{}'::jsonb,
  result jsonb,
  error_message text,
  parent_task_id uuid REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  is_resumable boolean NOT NULL DEFAULT true,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agent Plans table: dynamic multi-phase plans
CREATE TABLE public.agent_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_phase integer NOT NULL DEFAULT 0,
  total_phases integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'revising', 'completed', 'failed')),
  revision_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agent Execution Logs: trace every action
CREATE TABLE public.agent_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.agent_plans(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  phase_index integer,
  action_type text NOT NULL,
  tool_name text,
  input_data jsonb,
  output_data jsonb,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'success', 'error', 'skipped')),
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agent Schedules: cron-based automation
CREATE TABLE public.agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  task_template jsonb NOT NULL,
  cron_expression text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_tasks
CREATE POLICY "Users can view own tasks" ON public.agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON public.agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.agent_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.agent_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for agent_plans
CREATE POLICY "Users can view own plans" ON public.agent_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own plans" ON public.agent_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.agent_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.agent_plans FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for agent_execution_logs
CREATE POLICY "Users can view own logs" ON public.agent_execution_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own logs" ON public.agent_execution_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for agent_schedules
CREATE POLICY "Users can view own schedules" ON public.agent_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own schedules" ON public.agent_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON public.agent_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedules" ON public.agent_schedules FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_agent_tasks_updated_at BEFORE UPDATE ON public.agent_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_plans_updated_at BEFORE UPDATE ON public.agent_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_schedules_updated_at BEFORE UPDATE ON public.agent_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
