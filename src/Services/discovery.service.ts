import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from '../Models/match.model';
import { Swipe, SwipeDocument } from '../Models/swipe.model';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { BlockedUser, BlockedUserDocument } from '../Models/blocked-user.model';
import { DailyLimit, DailyLimitDocument } from '../Models/daily-limit.model';
import { MatchCardResponseDto } from '../DTO/match-card-response.dto';
import { MatchResultResponseDto } from '../DTO/match-result-response.dto';
import {
  MatchResponseDto,
  MatchesListResponseDto,
  MatchCardsListResponseDto,
} from '../DTO/match-list-response.dto';
import { ResponseTransformer } from '../Utils/response-transformer';
import { RecommendationService } from './recommendation.service';
import { PhotoService } from './photo.service';
import { FcmService } from './fcm.service';
import { User, UserDocument } from '../Models/user.model';

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Swipe.name) private swipeModel: Model<SwipeDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(BlockedUser.name) private blockedUserModel: Model<BlockedUserDocument>,
    @InjectModel(DailyLimit.name) private dailyLimitModel: Model<DailyLimitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private recommendationService: RecommendationService,
    private photoService: PhotoService,
    private fcmService: FcmService,
  ) {}

  /**
   * Get next match card based on recommendations
   */
  async getNextMatchCard(userId: string): Promise<MatchCardResponseDto | null> {
    // Get user profile for location
    let userProfile = await this.profileModel.findOne({ userId });
    if (!userProfile) {
      // Create profile if it doesn't exist (fallback for users who logged in before profile creation was added)
      userProfile = await this.profileModel.create({
        userId,
        interests: [],
        mode: 'dating',
      });
    }

    // Get blocked users (both ways: users I blocked + users who blocked me)
    const blockedUserIds = await this.getBlockedUserIds(userId);

    // Get already swiped users
    const swipedUserIds = await this.swipeModel
      .find({ userId })
      .distinct('targetUserId');

    // Get recommendations from existing service (it handles filtering)
    const recommendations = await this.recommendationService.getRecommendations(userId, 1);

    if (recommendations.length === 0) {
      return null; // No more candidates
    }

    const topCandidate = recommendations[0].profile;

    // Double-check the candidate is not blocked or swiped
    if (
      blockedUserIds.includes(topCandidate.userId) ||
      swipedUserIds.includes(topCandidate.userId)
    ) {
      return null;
    }

    // Fetch photos for candidate
    const candidatePhotos = await this.photoService.getUserPhotos(topCandidate.userId);

    // Transform to Android DTO
    return ResponseTransformer.toMatchCardResponse(
      topCandidate,
      userProfile.location,
      candidatePhotos,
    );
  }

  /**
   * Get multiple match cards (for preloading)
   */
  async getMatchCards(
    userId: string,
    limit: number,
  ): Promise<MatchCardsListResponseDto> {
    let userProfile = await this.profileModel.findOne({ userId });
    if (!userProfile) {
      // Create profile if it doesn't exist (fallback for users who logged in before profile creation was added)
      userProfile = await this.profileModel.create({
        userId,
        interests: [],
        mode: 'dating',
      });
    }

    const blockedUserIds = await this.getBlockedUserIds(userId);
    const swipedUserIds = await this.swipeModel
      .find({ userId })
      .distinct('targetUserId');

    // Get recommendations
    const recommendations = await this.recommendationService.getRecommendations(
      userId,
      limit + 5, // Get a few extra in case some are filtered
    );

    // Filter out blocked/swiped users
    const filteredRecs = recommendations
      .filter(
        (rec) =>
          !blockedUserIds.includes(rec.profile.userId) &&
          !swipedUserIds.includes(rec.profile.userId),
      )
      .slice(0, limit);

    // Fetch photos for all candidates in parallel
    const cardsWithPhotos = await Promise.all(
      filteredRecs.map(async (rec) => {
        const photos = await this.photoService.getUserPhotos(rec.profile.userId);
        return ResponseTransformer.toMatchCardResponse(
          rec.profile,
          userProfile.location,
          photos,
        );
      }),
    );

    return {
      cards: cardsWithPhotos,
      hasMore: recommendations.length > limit,
    };
  }

  /**
   * Like a user
   */
  async likeUser(
    userId: string,
    targetUserId: string,
  ): Promise<MatchResultResponseDto> {
    // Validate
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot like yourself');
    }

    // Check if target exists
    const targetProfile = await this.profileModel.findOne({ userId: targetUserId });
    if (!targetProfile) {
      throw new NotFoundException('Target user not found');
    }

    // Check if already swiped
    const existingSwipe = await this.swipeModel.findOne({ userId, targetUserId });
    
    if (existingSwipe) {
      // If already liked, return current result (idempotent)
      if (existingSwipe.action === 'like') {
        // Check if already matched
        const existingMatch = await this.matchModel.findOne({
          $or: [
            { userId, targetUserId, status: 'active' },
            { userId: targetUserId, targetUserId: userId, status: 'active' },
          ],
        });

        if (existingMatch) {
          // Already matched, return match result
          const targetPhotos = await this.photoService.getUserPhotos(targetUserId);
          return ResponseTransformer.toMatchResult(true, existingMatch, targetProfile, targetPhotos);
        }

        // Already liked but no match yet
        return ResponseTransformer.toMatchResult(false, null, null);
      }

      // If previously passed, allow changing to like (undo pass)
      if (existingSwipe.action === 'pass') {
        // Update the swipe action from pass to like
        existingSwipe.action = 'like';
        existingSwipe.timestamp = new Date();
        await existingSwipe.save();
      } else {
        // Other cases, throw error
        throw new BadRequestException('Already swiped on this user');
      }
    } else {
      // Check if blocked
      await this.checkNotBlocked(userId, targetUserId);

      // Create new swipe
      await this.swipeModel.create({
        userId,
        targetUserId,
        action: 'like',
        timestamp: new Date(),
      });
    }

    // Check for reciprocal like
    const reciprocalLike = await this.swipeModel.findOne({
      userId: targetUserId,
      targetUserId: userId,
      action: 'like',
    });

    if (!reciprocalLike) {
      // No match yet - send like notification
      await this.sendLikeNotification(userId, targetUserId);
      
      return ResponseTransformer.toMatchResult(false, null, null);
    }

    // Check if match already exists
    const existingMatch = await this.matchModel.findOne({
      $or: [
        { userId, targetUserId, status: 'active' },
        { userId: targetUserId, targetUserId: userId, status: 'active' },
      ],
    });

    if (existingMatch) {
      // Match already exists, return it
      const targetPhotos = await this.photoService.getUserPhotos(targetUserId);
      return ResponseTransformer.toMatchResult(true, existingMatch, targetProfile, targetPhotos);
    }

    // Create match!
    const match = await this.matchModel.create({
      userId,
      targetUserId,
      status: 'active',
      matchedAt: new Date(),
      // createdAt auto-generated by timestamps: true
    });

    // Fetch photos for target profile
    const targetPhotos = await this.photoService.getUserPhotos(targetUserId);

    // Send match notifications to both users
    await this.sendMatchNotification(userId, targetUserId, match);

    // Return match result with full profile
    return ResponseTransformer.toMatchResult(true, match, targetProfile, targetPhotos);
  }

  /**
   * Send like notification to target user
   */
  private async sendLikeNotification(likerId: string, targetUserId: string): Promise<void> {
    try {
      // Get target user's FCM token
      const targetUser = await this.userModel.findOne({ id: targetUserId }).select('fcmToken');
      if (!targetUser?.fcmToken) {
        return; // No FCM token, skip notification
      }

      // Get liker's profile info
      const likerProfile = await this.profileModel.findOne({ userId: likerId });
      if (!likerProfile) {
        return;
      }

      // Get liker's primary photo
      const likerPhotos = await this.photoService.getUserPhotos(likerId);
      const primaryPhoto = likerPhotos.find(p => p.isPrimary);
      const likerPhotoUrl = primaryPhoto?.url || likerPhotos[0]?.url;

      // Get display name
      const likerName = likerProfile.displayName || 
                       `${likerProfile.firstName || ''} ${likerProfile.lastName || ''}`.trim() || 
                       'Someone';

      // Send notification
      await this.fcmService.sendLikeNotification(
        targetUserId,
        targetUser.fcmToken,
        likerId,
        likerName,
        likerPhotoUrl,
      );
    } catch (error) {
      console.error('Error sending like notification:', error);
      // Don't throw - we don't want to fail the like operation
    }
  }

  /**
   * Send match notification to both users
   */
  private async sendMatchNotification(
    userId1: string,
    userId2: string,
    match: MatchDocument,
  ): Promise<void> {
    try {
      // Get both users' FCM tokens
      const [user1, user2] = await Promise.all([
        this.userModel.findOne({ id: userId1 }).select('fcmToken'),
        this.userModel.findOne({ id: userId2 }).select('fcmToken'),
      ]);

      // Get both users' profiles
      const [profile1, profile2] = await Promise.all([
        this.profileModel.findOne({ userId: userId1 }),
        this.profileModel.findOne({ userId: userId2 }),
      ]);

      if (!profile1 || !profile2) {
        return;
      }

      // Get photos for both users
      const [photos1, photos2] = await Promise.all([
        this.photoService.getUserPhotos(userId1),
        this.photoService.getUserPhotos(userId2),
      ]);

      const primaryPhoto1 = photos1.find(p => p.isPrimary);
      const primaryPhoto2 = photos2.find(p => p.isPrimary);
      const photoUrl1 = primaryPhoto1?.url || photos1[0]?.url;
      const photoUrl2 = primaryPhoto2?.url || photos2[0]?.url;

      // Get display names
      const name1 = profile1.displayName || 
                   `${profile1.firstName || ''} ${profile1.lastName || ''}`.trim() || 
                   'Someone';
      const name2 = profile2.displayName || 
                   `${profile2.firstName || ''} ${profile2.lastName || ''}`.trim() || 
                   'Someone';

      // Send notifications to both users
      const matchId = (match as any)._id?.toString() || (match as any).id;
      await this.fcmService.sendMatchNotification(
        userId1,
        user1?.fcmToken || null,
        userId2,
        user2?.fcmToken || null,
        matchId,
        name1,
        name2,
        photoUrl1,
        photoUrl2,
      );
    } catch (error) {
      console.error('Error sending match notification:', error);
      // Don't throw - we don't want to fail the match operation
    }
  }

  /**
   * Pass on a user
   */
  async passUser(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot pass on yourself');
    }

    const targetProfile = await this.profileModel.findOne({ userId: targetUserId });
    if (!targetProfile) {
      throw new NotFoundException('Target user not found');
    }

    const existingSwipe = await this.swipeModel.findOne({ userId, targetUserId });
    
    if (existingSwipe) {
      // If already passed, return success (idempotent)
      if (existingSwipe.action === 'pass') {
        return; // Already passed, no action needed
      }

      // If already liked, don't allow changing to pass
      // (Once liked, user should use unmatch instead)
      if (existingSwipe.action === 'like') {
        // Check if matched
        const existingMatch = await this.matchModel.findOne({
          $or: [
            { userId, targetUserId, status: 'active' },
            { userId: targetUserId, targetUserId: userId, status: 'active' },
          ],
        });

        if (existingMatch) {
          throw new BadRequestException('Cannot pass on a matched user. Use unmatch instead.');
        }

        throw new BadRequestException('Cannot pass on a user you already liked');
      }
    } else {
      // Create new pass swipe
      await this.swipeModel.create({
        userId,
        targetUserId,
        action: 'pass',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Super like a user (with daily limit check)
   */
  async superLikeUser(
    userId: string,
    targetUserId: string,
  ): Promise<MatchResultResponseDto> {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot super like yourself');
    }

    const targetProfile = await this.profileModel.findOne({ userId: targetUserId });
    if (!targetProfile) {
      throw new NotFoundException('Target user not found');
    }

    const existingSwipe = await this.swipeModel.findOne({ userId, targetUserId });
    
    // Check daily super like limit first
    const today = this.getTodayString();
    const dailyLimit = await this.dailyLimitModel.findOne({ userId, date: today });

    if (existingSwipe) {
      // If already super liked, return current result (idempotent)
      if (existingSwipe.action === 'like' && existingSwipe.isSuperLike) {
        // Check if already matched
        const existingMatch = await this.matchModel.findOne({
          $or: [
            { userId, targetUserId, status: 'active' },
            { userId: targetUserId, targetUserId: userId, status: 'active' },
          ],
        });

        if (existingMatch) {
          const targetPhotos = await this.photoService.getUserPhotos(targetUserId);
          return ResponseTransformer.toMatchResult(true, existingMatch, targetProfile, targetPhotos);
        }

        return ResponseTransformer.toMatchResult(false, null, null);
      }

      // If already liked (regular like), upgrade to super like if quota allows
      if (existingSwipe.action === 'like' && !existingSwipe.isSuperLike) {
        // Check quota
        if (dailyLimit && dailyLimit.superLikesCount >= dailyLimit.maxSuperLikes) {
          throw new HttpException(
            'Daily super like limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Update to super like
        existingSwipe.isSuperLike = true;
        existingSwipe.timestamp = new Date();
        await existingSwipe.save();

        // Update quota
        if (dailyLimit) {
          dailyLimit.superLikesCount += 1;
          await dailyLimit.save();
        } else {
          await this.dailyLimitModel.create({
            userId,
            date: today,
            likesCount: 0,
            superLikesCount: 1,
            maxLikes: 50,
            maxSuperLikes: 1,
          });
        }
      } else if (existingSwipe.action === 'pass') {
        // If previously passed, allow changing to super like (undo pass)
        // Check quota
        if (dailyLimit && dailyLimit.superLikesCount >= dailyLimit.maxSuperLikes) {
          throw new HttpException(
            'Daily super like limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        // Update from pass to super like
        existingSwipe.action = 'like';
        existingSwipe.isSuperLike = true;
        existingSwipe.timestamp = new Date();
        await existingSwipe.save();

        // Update quota
        if (dailyLimit) {
          dailyLimit.superLikesCount += 1;
          await dailyLimit.save();
        } else {
          await this.dailyLimitModel.create({
            userId,
            date: today,
            likesCount: 0,
            superLikesCount: 1,
            maxLikes: 50,
            maxSuperLikes: 1,
          });
        }
      } else {
        throw new BadRequestException('Already swiped on this user');
      }
    } else {
      // Check quota for new super like
      if (dailyLimit) {
        if (dailyLimit.superLikesCount >= dailyLimit.maxSuperLikes) {
          throw new HttpException(
            'Daily super like limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        dailyLimit.superLikesCount += 1;
        await dailyLimit.save();
      } else {
        await this.dailyLimitModel.create({
          userId,
          date: today,
          likesCount: 0,
          superLikesCount: 1,
          maxLikes: 50,
          maxSuperLikes: 1,
        });
      }

      await this.checkNotBlocked(userId, targetUserId);

      // Create new super like swipe
      await this.swipeModel.create({
        userId,
        targetUserId,
        action: 'like',
        timestamp: new Date(),
        isSuperLike: true,
      });
    }

    // Check for reciprocal like
    const reciprocalLike = await this.swipeModel.findOne({
      userId: targetUserId,
      targetUserId: userId,
      action: 'like',
    });

    if (!reciprocalLike) {
      return ResponseTransformer.toMatchResult(false, null, null);
    }

    // Check if match already exists
    const existingMatch = await this.matchModel.findOne({
      $or: [
        { userId, targetUserId, status: 'active' },
        { userId: targetUserId, targetUserId: userId, status: 'active' },
      ],
    });

    if (existingMatch) {
      // Match already exists, return it
      const targetPhotos = await this.photoService.getUserPhotos(targetUserId);
      return ResponseTransformer.toMatchResult(true, existingMatch, targetProfile, targetPhotos);
    }

    // Create match
    const match = await this.matchModel.create({
      userId,
      targetUserId,
      status: 'active',
      matchedAt: new Date(),
      // createdAt auto-generated by timestamps: true
    });

    // Fetch photos for target profile
    const targetPhotos = await this.photoService.getUserPhotos(targetUserId);

    // Send match notifications to both users
    await this.sendMatchNotification(userId, targetUserId, match);

    return ResponseTransformer.toMatchResult(true, match, targetProfile, targetPhotos);
  }

  /**
   * Block a user
   */
  async blockUser(
    userId: string,
    targetUserId: string,
    reason?: string,
  ): Promise<void> {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const targetProfile = await this.profileModel.findOne({ userId: targetUserId });
    if (!targetProfile) {
      throw new NotFoundException('Target user not found');
    }

    // Check if already blocked
    const existingBlock = await this.blockedUserModel.findOne({
      blockerUserId: userId,
      blockedUserId: targetUserId,
    });

    if (existingBlock) {
      throw new BadRequestException('User already blocked');
    }

    // Create block
    await this.blockedUserModel.create({
      blockerUserId: userId,
      blockedUserId: targetUserId,
      reason: reason || null,
      blockedAt: new Date(),
    });

    // If there's a match, unmatch them
    const existingMatch = await this.matchModel.findOne({
      $or: [
        { userId, targetUserId, status: 'active' },
        { userId: targetUserId, targetUserId: userId, status: 'active' },
      ],
    });

    if (existingMatch) {
      existingMatch.status = 'unmatched';
      existingMatch.unmatchedAt = new Date();
      await existingMatch.save();
    }
  }

  /**
   * Get paginated matches
   */
  async getMatchesPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<MatchesListResponseDto> {
    const skip = (page - 1) * limit;

    const [matches, total] = await Promise.all([
      this.matchModel
        .find({
          $or: [{ userId }, { targetUserId: userId }],
          status: 'active',
        })
        .sort({ matchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.matchModel.countDocuments({
        $or: [{ userId }, { targetUserId: userId }],
        status: 'active',
      }),
    ]);

    // Transform each match to MatchResponseDto
    const matchResponses: MatchResponseDto[] = [];

    for (const match of matches) {
      const otherUserId = match.userId === userId ? match.targetUserId : match.userId;
      const otherProfile = await this.profileModel.findOne({ userId: otherUserId });

      if (otherProfile) {
        const otherPhotos = await this.photoService.getUserPhotos(otherUserId);
        matchResponses.push(
          ResponseTransformer.toMatchResponse(match, otherProfile, userId, otherPhotos),
        );
      }
    }

    return {
      matches: matchResponses,
      total,
      page,
      limit,
    };
  }

  /**
   * Get single match by ID
   */
  async getMatchById(matchId: string, userId: string): Promise<MatchResponseDto> {
    // Validate matchId is a valid ObjectId
    if (!matchId || !/^[0-9a-fA-F]{24}$/.test(matchId)) {
      throw new BadRequestException('Invalid match ID format');
    }

    const match = await this.matchModel.findById(matchId);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify user is part of this match
    if (match.userId !== userId && match.targetUserId !== userId) {
      throw new BadRequestException('Not authorized to view this match');
    }

    const otherUserId = match.userId === userId ? match.targetUserId : match.userId;
    const otherProfile = await this.profileModel.findOne({ userId: otherUserId });

    if (!otherProfile) {
      throw new NotFoundException('Matched user profile not found');
    }

    const otherPhotos = await this.photoService.getUserPhotos(otherUserId);
    return ResponseTransformer.toMatchResponse(match, otherProfile, userId, otherPhotos);
  }

  /**
   * Unmatch by match ID
   */
  async unmatchByMatchId(matchId: string, userId: string): Promise<void> {
    const match = await this.matchModel.findById(matchId);

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify user is part of this match
    if (match.userId !== userId && match.targetUserId !== userId) {
      throw new BadRequestException('Not authorized to unmatch');
    }

    if (match.status !== 'active') {
      throw new BadRequestException('Match is not active');
    }

    match.status = 'unmatched';
    match.unmatchedAt = new Date();
    await match.save();
  }

  // ===== Helper Methods =====

  /**
   * Get all blocked user IDs (both directions)
   */
  private async getBlockedUserIds(userId: string): Promise<string[]> {
    const [blocked, blockedBy] = await Promise.all([
      this.blockedUserModel.find({ blockerUserId: userId }).distinct('blockedUserId'),
      this.blockedUserModel.find({ blockedUserId: userId }).distinct('blockerUserId'),
    ]);

    return [...blocked, ...blockedBy];
  }

  /**
   * Check if users are blocked (throws if blocked)
   */
  private async checkNotBlocked(userId: string, targetUserId: string): Promise<void> {
    const blocked = await this.blockedUserModel.findOne({
      $or: [
        { blockerUserId: userId, blockedUserId: targetUserId },
        { blockerUserId: targetUserId, blockedUserId: userId },
      ],
    });

    if (blocked) {
      throw new BadRequestException('Cannot interact with blocked user');
    }
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
}
