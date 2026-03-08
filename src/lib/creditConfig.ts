// Credit costs for various operations (based on Wiser AI PDR)
export const CREDIT_COSTS = {
  task_execution: 10,
  image_generation: 50,
  video_generation: 200,
  audio_generation: 30,
  music_generation: 40,
  beats_generation: 25,
  web_deployment: 100,
  connector_action: 5,
  chat_message: 0, // Chat messages are free
  document_processing: 15,
  podcast_generation: 75,
} as const;

// Daily credits by subscription tier (resets at midnight UTC)
export const TIER_DAILY_CREDITS = {
  free: 200,
  lite: 500,    // ~15,000/month ÷ 30
  pro: 1666,    // ~50,000/month ÷ 30
  max: 16666,   // ~500,000/month ÷ 30
} as const;

// Legacy: kept for backward compatibility
export const FREE_TIER_DAILY_CREDITS = TIER_DAILY_CREDITS.free;

// Legacy monthly references (for display/pricing page only)
export const TIER_MONTHLY_CREDITS = {
  free: 0,
  lite: 15000,
  pro: 50000,
  max: 500000,
} as const;

export type OperationType = keyof typeof CREDIT_COSTS;
export type SubscriptionTier = keyof typeof TIER_DAILY_CREDITS;

export function getCreditCost(operation: OperationType): number {
  return CREDIT_COSTS[operation] ?? 1;
}

export function getDailyCredits(tier: SubscriptionTier): number {
  return TIER_DAILY_CREDITS[tier];
}

export function getMonthlyCredits(tier: SubscriptionTier): number {
  return TIER_MONTHLY_CREDITS[tier];
}

// Check if daily reset is needed (for ALL tiers)
export function shouldResetDailyCredits(lastReset: Date): boolean {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setUTCHours(0, 0, 0, 0);
  
  return lastReset < resetTime && now >= resetTime;
}

// Get next reset time
export function getNextResetTime(): Date {
  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setUTCHours(0, 0, 0, 0);
  
  if (nextReset <= now) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }
  
  return nextReset;
}

// Format credits display
export function formatCredits(credits: number): string {
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(1)}M`;
  }
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  return credits.toString();
}
