import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Project {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function useProjects() {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      setProjects((data || []).map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon || 'folder',
        description: p.description,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      })));
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const createProject = useCallback(async (name: string, icon?: string, description?: string): Promise<string | null> => {
    if (!isAuthenticated || !user) return null;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name,
          icon: icon || 'folder',
          description,
        })
        .select('id')
        .single();

      if (error) throw error;
      
      await loadProjects();
      toast.success('Project created');
      return data.id;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  }, [isAuthenticated, user, loadProjects]);

  const updateProject = useCallback(async (id: string, updates: { name?: string; icon?: string; description?: string }) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await loadProjects();
      toast.success('Project updated');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  }, [isAuthenticated, user, loadProjects]);

  const deleteProject = useCallback(async (id: string, deleteChats: boolean = false) => {
    if (!isAuthenticated || !user) return;

    try {
      if (deleteChats) {
        // Delete all chats in the project first
        await supabase
          .from('chats')
          .delete()
          .eq('project_id', id);
      } else {
        // Just unlink chats from the project
        await supabase
          .from('chats')
          .update({ project_id: null })
          .eq('project_id', id);
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [isAuthenticated, loadProjects]);

  return {
    projects,
    isLoading,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
