// Stripe subscription tiers configuration
export const STRIPE_TIERS = {
  lite: {
    name: 'Lite',
    price: 20,
    price_id: 'price_1SmINURrf85GFWkwLWGJ8WrZ',
    product_id: 'prod_Tjlv1XcekXiyA3',
    requests: 5000,
    podcasts: 5,
    tokens: 100000,
  },
  pro: {
    name: 'Pro',
    price: 40,
    price_id: 'price_1SmIOBRrf85GFWkwMC3W7A2E',
    product_id: 'prod_TjlwMaE39JrWPc',
    requests: 25000,
    podcasts: 25,
    tokens: 500000,
  },
  max: {
    name: 'Max',
    price: 200,
    price_id: 'price_1SmIOdRrf85GFWkwJFPUfUho',
    product_id: 'prod_TjlwSBviPz1or8',
    requests: -1, // unlimited
    podcasts: -1, // unlimited
    tokens: -1, // unlimited
  },
} as const;

export const FREE_TIER = {
  name: 'Free',
  price: 0,
  requests: 1000,
  podcasts: 1,
  tokens: 10000,
};

export type TierKey = keyof typeof STRIPE_TIERS | 'free';

export function getTierByProductId(productId: string | null): TierKey {
  if (!productId) return 'free';
  for (const [key, tier] of Object.entries(STRIPE_TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return 'free';
}

export function getTierLimits(tier: TierKey) {
  if (tier === 'free') return FREE_TIER;
  return STRIPE_TIERS[tier];
}
