import { supabase } from '@/integrations/supabase/client';

export interface FeedbackData {
  messageId?: string;
  chatId?: string;
  feedbackType: 'positive' | 'negative';
}

/**
 * Submit feedback for an AI response
 */
export async function submitFeedback(data: FeedbackData): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      console.warn('User not authenticated, feedback not saved');
      return false;
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: userData.user.id,
      message_id: data.messageId || null,
      chat_id: data.chatId || null,
      feedback_type: data.feedbackType
    });

    if (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return false;
  }
}

/**
 * Get feedback stats for the current user
 */
export async function getFeedbackStats(): Promise<{ positive: number; negative: number }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      return { positive: 0, negative: 0 };
    }

    const { data, error } = await supabase
      .from('feedback')
      .select('feedback_type')
      .eq('user_id', userData.user.id);

    if (error || !data) {
      return { positive: 0, negative: 0 };
    }

    const positive = data.filter(f => f.feedback_type === 'positive').length;
    const negative = data.filter(f => f.feedback_type === 'negative').length;

    return { positive, negative };
  } catch {
    return { positive: 0, negative: 0 };
  }
}
