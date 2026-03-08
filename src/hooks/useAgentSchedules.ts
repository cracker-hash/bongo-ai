import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgentSchedule {
  id: string;
  name: string;
  description: string | null;
  cron_expression: string;
  task_template: {
    input: string;
    capability?: string;
  };
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export function useAgentSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSchedules = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSchedules((data as unknown as AgentSchedule[]) || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createSchedule = useCallback(async (name: string, description: string, cronExpression: string, taskInput: string, capability?: string) => {
    if (!user) { toast.error('Please sign in'); return null; }
    try {
      const { data, error } = await supabase
        .from('agent_schedules')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          cron_expression: cronExpression,
          task_template: JSON.parse(JSON.stringify({ input: taskInput, capability })),
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('Schedule created');
      await loadSchedules();
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule');
      return null;
    }
  }, [user, loadSchedules]);

  const updateSchedule = useCallback(async (id: string, updates: Partial<Pick<AgentSchedule, 'name' | 'description' | 'cron_expression' | 'is_active'> & { task_template: { input: string; capability?: string } }>) => {
    if (!user) return;
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.cron_expression !== undefined) updateData.cron_expression = updates.cron_expression;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.task_template !== undefined) updateData.task_template = updates.task_template as unknown as Record<string, unknown>;

      const { error } = await supabase
        .from('agent_schedules')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Schedule updated');
      await loadSchedules();
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  }, [user, loadSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('agent_schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Schedule deleted');
      await loadSchedules();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  }, [user, loadSchedules]);

  const toggleSchedule = useCallback(async (id: string, active: boolean) => {
    await updateSchedule(id, { is_active: active });
  }, [updateSchedule]);

  return { schedules, isLoading, loadSchedules, createSchedule, updateSchedule, deleteSchedule, toggleSchedule };
}
