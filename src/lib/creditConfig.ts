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
  chat_message: 1,
  document_processing: 15,
  podcast_generation: 75,
} as const;

// Daily credits for free tier (resets at midnight UTC)
export const FREE_TIER_DAILY_CREDITS = 200;

// Monthly credits by subscription tier
export const TIER_MONTHLY_CREDITS = {
  free: 0, // Uses daily allocation instead
  lite: 15000, // ~500/day
  pro: 50000, // ~1,666/day
  max: 500000, // ~16,666/day (effectively unlimited)
} as const;

export type OperationType = keyof typeof CREDIT_COSTS;
export type SubscriptionTier = keyof typeof TIER_MONTHLY_CREDITS;

export function getCreditCost(operation: OperationType): number {
  return CREDIT_COSTS[operation] ?? 1;
}

export function getMonthlyCredits(tier: SubscriptionTier): number {
  return TIER_MONTHLY_CREDITS[tier];
}

// Check if daily reset is needed (for free tier)
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
