import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FREE_TIER_DAILY_CREDITS, 
  TIER_MONTHLY_CREDITS,
  getCreditCost,
  shouldResetDailyCredits,
  getNextResetTime,
  OperationType,
  SubscriptionTier
} from '@/lib/creditConfig';

interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  monthly_allocation: number;
  last_daily_reset: string;
  last_monthly_reset: string | null;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  operation: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  balance_after: number;
  description: string | null;
  created_at: string;
}

export function useCredits() {
  const { user, isAuthenticated } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextResetTime, setNextResetTime] = useState<Date>(getNextResetTime());

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setIsLoading(false);
      return;
    }

    try {
      // Try to fetch existing credits record
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial credits record for new user
        const { data: newCredits, error: insertError } = await supabase
          .from('user_credits')
          .insert({
            user_id: user.id,
            balance: FREE_TIER_DAILY_CREDITS,
            subscription_tier: 'free',
            last_daily_reset: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setCredits(newCredits as UserCredits);
      } else {
        // Check if daily reset is needed for free tier
        const tier = data.subscription_tier as SubscriptionTier;
        if (tier === 'free' && shouldResetDailyCredits(new Date(data.last_daily_reset))) {
          // Reset credits for free tier
          const { data: updatedCredits, error: updateError } = await supabase
            .from('user_credits')
            .update({
              balance: FREE_TIER_DAILY_CREDITS,
              last_daily_reset: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .select()
            .single();

          if (updateError) throw updateError;
          setCredits(updatedCredits as UserCredits);
        } else {
          setCredits(data as UserCredits);
        }
      }

      setNextResetTime(getNextResetTime());
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async (limit = 20) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTransactions((data || []) as CreditTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [user]);

  const deductCredits = useCallback(async (
    operation: OperationType, 
    customAmount?: number,
    description?: string
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> => {
    if (!user || !credits) {
      return { success: false, error: 'Not authenticated' };
    }

    const cost = customAmount ?? getCreditCost(operation);

    if (credits.balance < cost) {
      return { 
        success: false, 
        error: `Insufficient credits. Required: ${cost}, Available: ${credits.balance}` 
      };
    }

    try {
      const newBalance = credits.balance - cost;

      // Update balance
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          operation,
          amount: cost,
          transaction_type: 'debit',
          balance_after: newBalance,
          description: description || `Used ${cost} credits for ${operation}`,
        });

      // Update local state
      setCredits(prev => prev ? { ...prev, balance: newBalance } : null);

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error deducting credits:', error);
      return { success: false, error: 'Failed to deduct credits' };
    }
  }, [user, credits]);

  const addCredits = useCallback(async (
    amount: number,
    reason: string
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> => {
    if (!user || !credits) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const newBalance = credits.balance + amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          operation: reason,
          amount,
          transaction_type: 'credit',
          balance_after: newBalance,
          description: `Added ${amount} credits: ${reason}`,
        });

      // Update local state
      setCredits(prev => prev ? { ...prev, balance: newBalance } : null);

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error adding credits:', error);
      return { success: false, error: 'Failed to add credits' };
    }
  }, [user, credits]);

  const updateSubscriptionTier = useCallback(async (
    tier: SubscriptionTier
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !credits) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const monthlyCredits = TIER_MONTHLY_CREDITS[tier];

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          subscription_tier: tier,
          balance: tier === 'free' ? FREE_TIER_DAILY_CREDITS : credits.balance + monthlyCredits,
          monthly_allocation: monthlyCredits,
          last_monthly_reset: tier !== 'free' ? new Date().toISOString() : null,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log the subscription change
      if (tier !== 'free') {
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            operation: 'subscription_upgrade',
            amount: monthlyCredits,
            transaction_type: 'credit',
            balance_after: credits.balance + monthlyCredits,
            description: `Upgraded to ${tier} tier - ${monthlyCredits} monthly credits`,
          });
      }

      await fetchCredits();
      return { success: true };
    } catch (error) {
      console.error('Error updating tier:', error);
      return { success: false, error: 'Failed to update subscription tier' };
    }
  }, [user, credits, fetchCredits]);

  // Check if user can afford an operation
  const canAfford = useCallback((operation: OperationType, customAmount?: number): boolean => {
    if (!credits) return false;
    const cost = customAmount ?? getCreditCost(operation);
    return credits.balance >= cost;
  }, [credits]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchCredits();
      fetchTransactions();
    }
  }, [isAuthenticated, fetchCredits, fetchTransactions]);

  // Update next reset time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNextResetTime(getNextResetTime());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    credits,
    balance: credits?.balance ?? 0,
    tier: (credits?.subscription_tier as SubscriptionTier) ?? 'free',
    transactions,
    isLoading,
    nextResetTime,
    fetchCredits,
    fetchTransactions,
    deductCredits,
    addCredits,
    updateSubscriptionTier,
    canAfford,
  };
}
