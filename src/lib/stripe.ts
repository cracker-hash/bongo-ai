// Stripe integration utilities for WISER AI monetization
// This module handles subscription management and payment processing

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '1,000 API requests/month',
      '5 podcast generations',
      'Basic chat modes',
      'Community support'
    ]
  },
  {
    id: 'lite',
    name: 'Lite',
    description: 'For growing learners',
    monthlyPrice: 2000, // in cents
    yearlyPrice: 19200,
    features: [
      '10,000 API requests/month',
      '50 podcast generations',
      'All chat modes',
      'Priority support',
      'Project management'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    monthlyPrice: 4000,
    yearlyPrice: 38400,
    features: [
      '100,000 API requests/month',
      'Unlimited podcasts',
      'Manus automation',
      'API access',
      'Advanced analytics'
    ]
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Enterprise-grade solution',
    monthlyPrice: 20000,
    yearlyPrice: 192000,
    features: [
      'Unlimited API requests',
      'White-label options',
      'Dedicated support',
      'Custom SLAs',
      'On-premise deployment'
    ]
  }
];

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

// Helper to check user's subscription status
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  // This would be implemented with actual Supabase/Stripe integration
  // For now, return default free status
  return {
    isActive: true,
    plan: 'free'
  };
}

// Helper to check if user has access to a feature
export function hasFeatureAccess(plan: string, feature: string): boolean {
  const featureMatrix: Record<string, string[]> = {
    free: ['basic_chat', 'study_mode', 'quiz_mode'],
    lite: ['basic_chat', 'study_mode', 'quiz_mode', 'all_modes', 'projects', 'podcasts'],
    pro: ['basic_chat', 'study_mode', 'quiz_mode', 'all_modes', 'projects', 'podcasts', 'manus', 'api_access', 'analytics'],
    max: ['basic_chat', 'study_mode', 'quiz_mode', 'all_modes', 'projects', 'podcasts', 'manus', 'api_access', 'analytics', 'white_label', 'sso', 'custom_training']
  };

  return featureMatrix[plan]?.includes(feature) ?? false;
}

// Get usage limits for a plan
export function getUsageLimits(plan: string): { requests: number; podcasts: number; tokens: number } {
  const limits: Record<string, { requests: number; podcasts: number; tokens: number }> = {
    free: { requests: 1000, podcasts: 5, tokens: 100000 },
    lite: { requests: 10000, podcasts: 50, tokens: 1000000 },
    pro: { requests: 100000, podcasts: -1, tokens: 10000000 }, // -1 = unlimited
    max: { requests: -1, podcasts: -1, tokens: -1 }
  };

  return limits[plan] ?? limits.free;
}
