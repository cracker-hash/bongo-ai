import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, BookOpen, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface StudyTask {
  id: string;
  title: string;
  description: string;
  day: number;
  completed: boolean;
  topic?: string;
}

interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  tasks: StudyTask[];
  created_at: string;
}

export function StudyPlanView() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('capability', 'study_plan')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      
      const parsed: StudyPlan[] = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        subject: t.description || '',
        tasks: (t.result?.tasks || t.context?.tasks || []).map((task: any, i: number) => ({
          id: `${t.id}-${i}`,
          title: task.title || task.name || `Day ${i + 1}`,
          description: task.description || '',
          day: task.day || i + 1,
          completed: task.completed || false,
          topic: task.topic,
        })),
        created_at: t.created_at,
      }));
      setPlans(parsed);
    } catch (err) {
      console.error('Failed to load study plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const toggleTask = useCallback(async (planId: string, taskIndex: number) => {
    setPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      const updated = { ...plan, tasks: plan.tasks.map((t, i) => 
        i === taskIndex ? { ...t, completed: !t.completed } : t
      )};
      // Persist to DB
      supabase.from('agent_tasks').update({
        result: { tasks: updated.tasks as any }
      }).eq('id', planId).then();
      return updated;
    }));
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <CalendarDays className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No study plans yet</h3>
        <p className="text-muted-foreground text-sm">
          Say "create a study plan for [subject]" in chat to generate one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {plans.map((plan) => {
        const completed = plan.tasks.filter(t => t.completed).length;
        const progress = plan.tasks.length > 0 ? Math.round((completed / plan.tasks.length) * 100) : 0;

        return (
          <Card key={plan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plan.title}</CardTitle>
                <Badge variant={progress === 100 ? "default" : "outline"}>
                  {progress}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {format(new Date(plan.created_at), 'MMM d, yyyy')}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    task.completed ? "bg-muted/50 border-muted" : "bg-card border-border"
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(plan.id, idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>
                      Day {task.day}: {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
