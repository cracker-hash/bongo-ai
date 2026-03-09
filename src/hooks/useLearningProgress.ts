import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LearningTopic {
  id: string;
  user_id: string;
  topic: string;
  mastery_level: number;
  last_studied: string;
  quiz_scores: number[];
  total_sessions: number;
}

export function useLearningProgress() {
  const { user, isAuthenticated } = useAuth();
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_studied', { ascending: false });
      if (error) throw error;
      setTopics((data as unknown as LearningTopic[]) || []);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const updateTopicMastery = useCallback(async (topic: string, score: number) => {
    if (!isAuthenticated || !user) return;
    try {
      const existing = topics.find(t => t.topic === topic);
      if (existing) {
        const scores = [...(existing.quiz_scores || []), score];
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const mastery = Math.min(100, Math.round(avgScore));
        await supabase.from('learning_progress').update({
          mastery_level: mastery,
          quiz_scores: scores,
          total_sessions: existing.total_sessions + 1,
          last_studied: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('learning_progress').insert({
          user_id: user.id,
          topic,
          mastery_level: Math.min(100, Math.round(score)),
          quiz_scores: [score],
          total_sessions: 1,
          last_studied: new Date().toISOString(),
        });
      }
      await loadProgress();
    } catch (err) {
      console.error('Failed to update mastery:', err);
    }
  }, [isAuthenticated, user, topics, loadProgress]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  return { topics, isLoading, loadProgress, updateTopicMastery };
}
