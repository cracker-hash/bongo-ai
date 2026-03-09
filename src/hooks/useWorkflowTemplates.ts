import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WorkflowStep {
  name: string;
  tool: string;
  description: string;
  params?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  is_public: boolean;
  use_count: number;
  created_at: string;
}

export function useWorkflowTemplates() {
  const { user, isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('use_count', { ascending: false });
      if (error) throw error;
      setTemplates((data as unknown as WorkflowTemplate[]) || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const createTemplate = useCallback(async (name: string, description: string, steps: WorkflowStep[]) => {
    if (!isAuthenticated || !user) return;
    try {
      const { error } = await supabase.from('workflow_templates').insert({
        user_id: user.id, name, description, steps,
      });
      if (error) throw error;
      toast.success('Workflow template saved!');
      await loadTemplates();
    } catch (err) {
      toast.error('Failed to save template');
    }
  }, [isAuthenticated, user, loadTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('workflow_templates').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else await loadTemplates();
  }, [loadTemplates]);

  const runTemplate = useCallback(async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template || !user) return null;
    
    // Increment use count
    await supabase.from('workflow_templates').update({ use_count: template.use_count + 1 }).eq('id', id);
    
    // Create an agent task from the template
    const input = `Execute workflow: ${template.name}\n\nSteps:\n${template.steps.map((s, i) => `${i + 1}. ${s.name}: ${s.description}`).join('\n')}`;
    
    const { data, error } = await supabase.functions.invoke('agent-orchestrator', {
      body: { action: 'create_task', input, capability: 'automation' }
    });
    if (error) {
      toast.error('Failed to run workflow');
      return null;
    }
    toast.success('Workflow started!');
    return data;
  }, [templates, user]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  return { templates, isLoading, loadTemplates, createTemplate, deleteTemplate, runTemplate };
}
