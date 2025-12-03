/**
 * Subscription tier constants and limits
 */

export enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  GOLD = 'GOLD',
  ELITE = 'ELITE',
}

export interface TierLimits {
  likes: number | null; // null = unlimited
  superLikes: number;
  rewinds: number | null; // null = unlimited
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    likes: 30, // 30 likes/day
    superLikes: 0, // No superlikes for free
    rewinds: 0, // No rewinds for free
  },
  [SubscriptionTier.BASIC]: {
    likes: null, // Unlimited
    superLikes: 1, // 1/day
    rewinds: 1, // 1/day
  },
  [SubscriptionTier.GOLD]: {
    likes: null, // Unlimited
    superLikes: 3, // 3/day
    rewinds: 3, // 3/day
  },
  [SubscriptionTier.ELITE]: {
    likes: null, // Unlimited
    superLikes: 5, // 5/day
    rewinds: null, // Unlimited
  },
};

/**
 * Get daily limit for a specific action and tier
 */
export function getDailyLimit(
  tier: SubscriptionTier,
  action: 'likes' | 'superLikes' | 'rewinds',
): number | null {
  return SUBSCRIPTION_LIMITS[tier][action];
}

/**
 * Check if action is allowed for tier
 */
export function isActionAllowedForTier(
  tier: SubscriptionTier,
  action: 'like' | 'superlike' | 'rewind',
): boolean {
  const limits = SUBSCRIPTION_LIMITS[tier];

  switch (action) {
    case 'like':
      return true; // All tiers can like
    case 'superlike':
      return limits.superLikes > 0;
    case 'rewind':
      return limits.rewinds !== 0;
    default:
      return false;
  }
}
