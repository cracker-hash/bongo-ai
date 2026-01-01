// XP Gamification Hook - Migrated to Supabase
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GamificationData {
  xp: number;
  level: number;
  streakDays: number;
  badges: string[];
  lastActivityDate: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'xp' | 'streak' | 'chats' | 'quizzes';
}

const BADGES: Badge[] = [
  { id: 'first_chat', name: 'First Steps', description: 'Send your first message', icon: '💬', requirement: 1, type: 'chats' },
  { id: 'xp_100', name: 'Rising Star', description: 'Earn 100 XP', icon: '⭐', requirement: 100, type: 'xp' },
  { id: 'xp_500', name: 'Knowledge Seeker', description: 'Earn 500 XP', icon: '🌟', requirement: 500, type: 'xp' },
  { id: 'xp_1000', name: 'Wisdom Master', description: 'Earn 1000 XP', icon: '🏆', requirement: 1000, type: 'xp' },
  { id: 'streak_3', name: 'On Fire', description: '3 day streak', icon: '🔥', requirement: 3, type: 'streak' },
  { id: 'streak_7', name: 'Week Warrior', description: '7 day streak', icon: '💪', requirement: 7, type: 'streak' },
  { id: 'streak_30', name: 'Dedicated Learner', description: '30 day streak', icon: '👑', requirement: 30, type: 'streak' },
  { id: 'quiz_master', name: 'Quiz Master', description: 'Complete 10 quizzes', icon: '🎯', requirement: 10, type: 'quizzes' },
];

// XP rewards for different actions
const XP_REWARDS = {
  sendMessage: 5,
  completeQuiz: 25,
  correctAnswer: 10,
  uploadDocument: 15,
  createProject: 20,
  pinChat: 5,
  archiveChat: 5,
  dailyLogin: 10,
  studySession: 20,
};

const calculateLevel = (xp: number): number => {
  // Level formula: level = floor(sqrt(xp / 50)) + 1
  return Math.floor(Math.sqrt(xp / 50)) + 1;
};

const xpForNextLevel = (level: number): number => {
  return level * level * 50;
};

export function useGamification() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<GamificationData>({
    xp: 0,
    level: 1,
    streakDays: 0,
    badges: [],
    lastActivityDate: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load gamification data
  const loadGamificationData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    try {
      const { data: gamificationData, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (gamificationData) {
        setData({
          xp: gamificationData.xp,
          level: gamificationData.level,
          streakDays: gamificationData.streak_days,
          badges: gamificationData.badges || [],
          lastActivityDate: gamificationData.last_activity_date,
        });
      } else {
        // Create initial gamification record
        const { error: insertError } = await supabase
          .from('user_gamification')
          .insert({ user_id: user.id });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Award XP
  const awardXP = useCallback(async (action: keyof typeof XP_REWARDS, customAmount?: number) => {
    if (!isAuthenticated || !user) return;

    const xpAmount = customAmount || XP_REWARDS[action];
    const newXP = data.xp + xpAmount;
    const newLevel = calculateLevel(newXP);
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate streak
    let newStreak = data.streakDays;
    if (data.lastActivityDate) {
      const lastDate = new Date(data.lastActivityDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // Check for new badges
    const newBadges = [...data.badges];
    let earnedNewBadge = false;
    
    BADGES.forEach(badge => {
      if (!newBadges.includes(badge.id)) {
        let qualified = false;
        if (badge.type === 'xp' && newXP >= badge.requirement) qualified = true;
        if (badge.type === 'streak' && newStreak >= badge.requirement) qualified = true;
        
        if (qualified) {
          newBadges.push(badge.id);
          earnedNewBadge = true;
          toast.success(`🎖️ Badge Earned: ${badge.name}`, {
            description: badge.description,
          });
        }
      }
    });

    try {
      const { error } = await supabase
        .from('user_gamification')
        .update({
          xp: newXP,
          level: newLevel,
          streak_days: newStreak,
          badges: newBadges,
          last_activity_date: today,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setData({
        xp: newXP,
        level: newLevel,
        streakDays: newStreak,
        badges: newBadges,
        lastActivityDate: today,
      });

      // Show level up notification
      if (newLevel > data.level) {
        toast.success(`🎉 Level Up!`, {
          description: `You reached level ${newLevel}!`,
        });
      }

      // Show XP earned (subtle)
      toast(`+${xpAmount} XP`, {
        duration: 1500,
        icon: '✨',
      });

    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  }, [isAuthenticated, user, data]);

  // Get progress to next level
  const getProgress = useCallback(() => {
    const currentLevelXP = (data.level - 1) * (data.level - 1) * 50;
    const nextLevelXP = xpForNextLevel(data.level);
    const progress = ((data.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [data]);

  // Get user badges with full details
  const getUserBadges = useCallback(() => {
    return BADGES.filter(badge => data.badges.includes(badge.id));
  }, [data.badges]);

  // Get next achievable badges
  const getNextBadges = useCallback(() => {
    return BADGES.filter(badge => !data.badges.includes(badge.id)).slice(0, 3);
  }, [data.badges]);

  useEffect(() => {
    if (isAuthenticated) {
      loadGamificationData();
    }
  }, [isAuthenticated, loadGamificationData]);

  return {
    ...data,
    isLoading,
    awardXP,
    getProgress,
    getUserBadges,
    getNextBadges,
    xpForNextLevel: xpForNextLevel(data.level),
    XP_REWARDS,
    BADGES,
    loadGamificationData,
  };
}
