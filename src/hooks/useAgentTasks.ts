import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgentPhase {
  index: number;
  name: string;
  capability: string;
  description: string;
  tools: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  capability: string;
  context: any;
  result: any;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  agent_plans?: {
    id: string;
    phases: AgentPhase[];
    current_phase: number;
    total_phases: number;
    status: string;
    revision_count: number;
  }[];
  agent_execution_logs?: {
    id: string;
    action_type: string;
    tool_name: string | null;
    status: string;
    duration_ms: number | null;
    error_message: string | null;
    created_at: string;
  }[];
}

export function useAgentTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const callOrchestrator = useCallback(async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-orchestrator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }

    return resp.json();
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await callOrchestrator({ action: 'get_tasks' });
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, callOrchestrator]);

  const createTask = useCallback(async (input: string, capability?: string) => {
    if (!user) {
      toast.error('Please sign in');
      return null;
    }
    try {
      const data = await callOrchestrator({ action: 'create_task', input, capability });
      toast.success('Task created with plan');
      await loadTasks();
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
      return null;
    }
  }, [user, callOrchestrator, loadTasks]);

  const runTask = useCallback(async (taskId: string) => {
    setActiveTaskId(taskId);
    try {
      const data = await callOrchestrator({ action: 'run_task', taskId });
      await loadTasks();
      if (data.success) {
        toast.success('Task completed successfully');
      } else {
        toast.error(data.error || 'Task failed');
      }
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run task');
      return null;
    } finally {
      setActiveTaskId(null);
    }
  }, [callOrchestrator, loadTasks]);

  const pauseTask = useCallback(async (taskId: string) => {
    try {
      await callOrchestrator({ action: 'pause_task', taskId });
      toast.success('Task paused');
      await loadTasks();
    } catch (error) {
      toast.error('Failed to pause task');
    }
  }, [callOrchestrator, loadTasks]);

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      await callOrchestrator({ action: 'cancel_task', taskId });
      toast.success('Task cancelled');
      await loadTasks();
    } catch (error) {
      toast.error('Failed to cancel task');
    }
  }, [callOrchestrator, loadTasks]);

  const getTaskDetail = useCallback(async (taskId: string) => {
    try {
      const data = await callOrchestrator({ action: 'get_task_detail', taskId });
      return data.task;
    } catch (error) {
      toast.error('Failed to load task details');
      return null;
    }
  }, [callOrchestrator]);

  return {
    tasks,
    isLoading,
    activeTaskId,
    loadTasks,
    createTask,
    runTask,
    pauseTask,
    cancelTask,
    getTaskDetail,
  };
}
