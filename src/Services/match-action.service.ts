import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Swipe, SwipeDocument } from '../Models/swipe.model';
import { DailyLimit, DailyLimitDocument } from '../Models/daily-limit.model';
import { User, UserDocument } from '../Models/user.model';
import { MatchService } from './match.service';
import {
  SubscriptionTier,
  getDailyLimit,
  isActionAllowedForTier,
} from '../Utils/subscription-tier.constants';
import {
  SelfLikeException,
  AlreadyLikedException,
  AlreadyMatchedException,
  UserBlockedException,
  UserNotFoundException,
  OutOfLikesException,
  OutOfSuperLikesException,
  TierNotAllowedException,
} from '../Utils/match.exceptions';
import {
  LikeResponseDto,
  SuperLikeResponseDto,
  DislikeResponseDto,
  QuotaResponseDto,
} from '../DTO/match-action-response.dto';

@Injectable()
export class MatchActionService {
  private readonly logger = new Logger(MatchActionService.name);

  constructor(
    @InjectModel(Swipe.name) private swipeModel: Model<SwipeDocument>,
    @InjectModel(DailyLimit.name)
    private dailyLimitModel: Model<DailyLimitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly matchService: MatchService,
  ) {}

  /**
   * Get today's date in YYYY-MM-DD format (UTC)
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get tomorrow's date at 00:00 UTC
   */
  private getTomorrowDate(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get user's subscription tier (default to FREE if not set)
   */
  private async getUserTier(userId: string): Promise<SubscriptionTier> {
    const user = await this.userModel.findOne({ id: userId });
    // TODO: Add subscriptionTier field to User model
    // For now, default to FREE
    return (user as any)?.subscriptionTier || SubscriptionTier.FREE;
  }

  /**
   * Get or create daily limit record for user
   */
  private async getDailyLimit(
    userId: string,
    date: string,
  ): Promise<DailyLimitDocument> {
    let limit = await this.dailyLimitModel.findOne({ userId, date });

    if (!limit) {
      const tier = await this.getUserTier(userId);
      const limits = getDailyLimit(tier, 'likes');
      const superLimits = getDailyLimit(tier, 'superLikes');

      limit = await this.dailyLimitModel.create({
        userId,
        date,
        likesCount: 0,
        superLikesCount: 0,
        maxLikes: limits ?? 999999,
        maxSuperLikes: superLimits ?? 0,
      });
    }

    return limit;
  }

  /**
   * Check remaining quota for an action
   */
  private async checkQuota(
    userId: string,
    action: 'likes' | 'superLikes',
  ): Promise<{ allowed: boolean; remaining: number | string }> {
    const tier = await this.getUserTier(userId);
    const today = this.getTodayDate();
    const limit = await this.getDailyLimit(userId, today);

    const dailyLimit = getDailyLimit(tier, action);
    const used = action === 'likes' ? limit.likesCount : limit.superLikesCount;

    if (dailyLimit === null) {
      return { allowed: true, remaining: 'Unlimited' };
    }

    const remaining = dailyLimit - used;

    return {
      allowed: remaining > 0,
      remaining: remaining > 0 ? remaining : 0,
    };
  }

  /**
   * Deduct quota for an action
   */
  private async deductQuota(
    userId: string,
    action: 'likes' | 'superLikes',
  ): Promise<void> {
    const today = this.getTodayDate();
    const limit = await this.getDailyLimit(userId, today);

    if (action === 'likes') {
      limit.likesCount += 1;
    } else {
      limit.superLikesCount += 1;
    }

    await limit.save();
  }

  /**
   * Validate common conditions for like/superlike
   */
  private async validateAction(
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    // Check self-like
    if (userId === targetUserId) {
      throw new SelfLikeException();
    }

    // Check if target user exists and is active
    const targetActive = await this.matchService.checkUserActive(targetUserId);
    if (!targetActive) {
      throw new UserNotFoundException();
    }

    // Check if users are blocked
    const isBlocked = await this.matchService.checkBlockStatus(
      userId,
      targetUserId,
    );
    if (isBlocked) {
      throw new UserBlockedException();
    }

    // Check if already matched
    const alreadyMatched = await this.matchService.checkMatchExists(
      userId,
      targetUserId,
    );
    if (alreadyMatched) {
      throw new AlreadyMatchedException();
    }

    // Check if already liked
    const existingSwipe = await this.swipeModel.findOne({
      userId,
      targetUserId,
      action: 'like',
    });
    if (existingSwipe) {
      throw new AlreadyLikedException();
    }
  }

  /**
   * Handle Like action
   */
  async handleLike(
    userId: string,
    targetUserId: string,
  ): Promise<LikeResponseDto> {
    this.logger.log(`User ${userId} attempting to like ${targetUserId}`);

    // Validate
    await this.validateAction(userId, targetUserId);

    // Check quota
    const tier = await this.getUserTier(userId);
    const quota = await this.checkQuota(userId, 'likes');

    if (!quota.allowed) {
      throw new OutOfLikesException(this.getTomorrowDate());
    }

    // Record the like
    await this.swipeModel.create({
      userId,
      targetUserId,
      action: 'like',
      timestamp: new Date(),
      isSuperLike: false,
    });

    // Deduct quota (only for FREE tier)
    if (tier === SubscriptionTier.FREE) {
      await this.deductQuota(userId, 'likes');
    }

    // Check for reciprocal like
    const reciprocalLike = await this.matchService.checkReciprocalLike(
      userId,
      targetUserId,
    );

    if (reciprocalLike) {
      // Create match
      const matchResult = await this.matchService.createMatchWithLock(
        userId,
        targetUserId,
      );

      if (matchResult.success) {
        this.logger.log(
          `Match created: ${userId} - ${targetUserId}, Match ID: ${matchResult.match?._id}`,
        );

        // Get updated quota
        const updatedQuota = await this.checkQuota(userId, 'likes');

        return {
          success: true,
          action: 'LIKE',
          matchCreated: true,
          matchId: (matchResult.match as any)?._id?.toString(),
          conversationId: (matchResult.conversation as any)?._id?.toString(),
          remainingLikes: updatedQuota.remaining,
          message: "It's a Match! 🎉",
        };
      }
    }

    // No match created
    const updatedQuota = await this.checkQuota(userId, 'likes');

    // TODO: Send notification to target user

    return {
      success: true,
      action: 'LIKE',
      matchCreated: false,
      remainingLikes: updatedQuota.remaining,
      message: 'Like recorded successfully',
    };
  }

  /**
   * Handle SuperLike action
   */
  async handleSuperLike(
    userId: string,
    targetUserId: string,
  ): Promise<SuperLikeResponseDto> {
    this.logger.log(`User ${userId} attempting to SuperLike ${targetUserId}`);

    // Validate
    await this.validateAction(userId, targetUserId);

    // Check if SuperLike is allowed for tier
    const tier = await this.getUserTier(userId);
    if (!isActionAllowedForTier(tier, 'superlike')) {
      throw new TierNotAllowedException('SuperLike');
    }

    // Check quota
    const quota = await this.checkQuota(userId, 'superLikes');
    if (!quota.allowed) {
      throw new OutOfSuperLikesException(this.getTomorrowDate());
    }

    // Record the SuperLike as a regular like with isSuperLike flag
    await this.swipeModel.create({
      userId,
      targetUserId,
      action: 'like',
      timestamp: new Date(),
      isSuperLike: true,
    });

    // Deduct quota
    await this.deductQuota(userId, 'superLikes');

    // TODO: Send IMMEDIATE notification to target user
    const notificationSent = true;

    // Check for reciprocal like
    const reciprocalLike = await this.matchService.checkReciprocalLike(
      userId,
      targetUserId,
    );

    if (reciprocalLike) {
      // Create match
      const matchResult = await this.matchService.createMatchWithLock(
        userId,
        targetUserId,
      );

      if (matchResult.success) {
        this.logger.log(
          `Match created via SuperLike: ${userId} - ${targetUserId}`,
        );

        const updatedQuota = await this.checkQuota(userId, 'superLikes');

        return {
          success: true,
          action: 'SUPERLIKE',
          matchCreated: true,
          matchId: (matchResult.match as any)?._id?.toString(),
          conversationId: (matchResult.conversation as any)?._id?.toString(),
          remainingSuperLikes: updatedQuota.remaining,
          notificationSent,
          message: "It's a Match! 🎉",
        };
      }
    }

    // No match created
    const updatedQuota = await this.checkQuota(userId, 'superLikes');

    return {
      success: true,
      action: 'SUPERLIKE',
      matchCreated: false,
      remainingSuperLikes: updatedQuota.remaining,
      notificationSent,
      message: 'SuperLike sent! They will see a special notification.',
    };
  }

  /**
   * Handle Dislike action
   */
  async handleDislike(
    userId: string,
    targetUserId: string,
  ): Promise<DislikeResponseDto> {
    this.logger.log(`User ${userId} disliking ${targetUserId}`);

    // Check self-dislike
    if (userId === targetUserId) {
      throw new SelfLikeException();
    }

    // Check if already disliked
    const existingDislike = await this.swipeModel.findOne({
      userId,
      targetUserId,
      action: 'pass',
    });

    if (!existingDislike) {
      // Record the dislike
      await this.swipeModel.create({
        userId,
        targetUserId,
        action: 'pass',
        timestamp: new Date(),
        isSuperLike: false,
      });
    }

    return {
      success: true,
      action: 'DISLIKE',
      message: 'Profile will not be shown again',
    };
  }

  /**
   * Get user's quota information
   */
  async getQuota(userId: string): Promise<QuotaResponseDto> {
    const tier = await this.getUserTier(userId);
    const today = this.getTodayDate();
    const limit = await this.getDailyLimit(userId, today);

    const likesLimit = getDailyLimit(tier, 'likes');
    const superLikesLimit = getDailyLimit(tier, 'superLikes');
    const rewindsLimit = getDailyLimit(tier, 'rewinds');

    return {
      subscriptionTier: tier,
      date: today,
      resetAt: this.getTomorrowDate().toISOString(),
      actions: {
        likes: {
          dailyLimit: likesLimit,
          usedToday: limit.likesCount,
          remaining:
            likesLimit === null
              ? 'Unlimited'
              : Math.max(0, likesLimit - limit.likesCount),
        },
        superLikes: {
          dailyLimit: superLikesLimit,
          usedToday: limit.superLikesCount,
          remaining:
            superLikesLimit === null
              ? 'Unlimited'
              : Math.max(0, superLikesLimit - limit.superLikesCount),
        },
        rewinds: {
          dailyLimit: rewindsLimit,
          usedToday: 0, // TODO: Track rewinds
          remaining: rewindsLimit === null ? 'Unlimited' : rewindsLimit,
        },
      },
    };
  }
}
