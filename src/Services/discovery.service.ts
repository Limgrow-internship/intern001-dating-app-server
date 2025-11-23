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

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Swipe.name) private swipeModel: Model<SwipeDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(BlockedUser.name) private blockedUserModel: Model<BlockedUserDocument>,
    @InjectModel(DailyLimit.name) private dailyLimitModel: Model<DailyLimitDocument>,
    private recommendationService: RecommendationService,
    private photoService: PhotoService,
  ) {}

  /**
   * Get next match card based on recommendations
   */
  async getNextMatchCard(userId: string): Promise<MatchCardResponseDto | null> {
    // Get user profile for location
    const userProfile = await this.profileModel.findOne({ userId });
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
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
    const userProfile = await this.profileModel.findOne({ userId });
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
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
      throw new BadRequestException('Already swiped on this user');
    }

    // Check if blocked
    await this.checkNotBlocked(userId, targetUserId);

    // Create swipe
    await this.swipeModel.create({
      userId,
      targetUserId,
      action: 'like',
      timestamp: new Date(),
    });

    // Check for reciprocal like
    const reciprocalLike = await this.swipeModel.findOne({
      userId: targetUserId,
      targetUserId: userId,
      action: 'like',
    });

    if (!reciprocalLike) {
      // No match yet
      return ResponseTransformer.toMatchResult(false, null, null);
    }

    // Create match!
    const match = await this.matchModel.create({
      userId,
      targetUserId,
      status: 'matched',
      matchedAt: new Date(),
      // createdAt auto-generated by timestamps: true
    });

    // Fetch photos for target profile
    const targetPhotos = await this.photoService.getUserPhotos(targetUserId);

    // Return match result with full profile
    return ResponseTransformer.toMatchResult(true, match, targetProfile, targetPhotos);
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
      throw new BadRequestException('Already swiped on this user');
    }

    await this.swipeModel.create({
      userId,
      targetUserId,
      action: 'pass',
      timestamp: new Date(),
    });
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
    if (existingSwipe) {
      throw new BadRequestException('Already swiped on this user');
    }

    await this.checkNotBlocked(userId, targetUserId);

    // Check daily super like limit
    const today = this.getTodayString();
    const dailyLimit = await this.dailyLimitModel.findOne({ userId, date: today });

    if (dailyLimit) {
      if (dailyLimit.superLikesCount >= dailyLimit.maxSuperLikes) {
        throw new HttpException(
          'Daily super like limit reached',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Increment counter
      dailyLimit.superLikesCount += 1;
      await dailyLimit.save();
    } else {
      // Create new daily limit entry
      await this.dailyLimitModel.create({
        userId,
        date: today,
        likesCount: 0,
        superLikesCount: 1,
        maxLikes: 50,
        maxSuperLikes: 1, // Default for free users
      });
    }

    // Create swipe with super like flag
    await this.swipeModel.create({
      userId,
      targetUserId,
      action: 'like',
      timestamp: new Date(),
      isSuperLike: true, // Note: May need to add this field to Swipe model
    });

    // Check for reciprocal like
    const reciprocalLike = await this.swipeModel.findOne({
      userId: targetUserId,
      targetUserId: userId,
      action: 'like',
    });

    if (!reciprocalLike) {
      return ResponseTransformer.toMatchResult(false, null, null);
    }

    // Create match
    const match = await this.matchModel.create({
      userId,
      targetUserId,
      status: 'matched',
      matchedAt: new Date(),
      // createdAt auto-generated by timestamps: true
    });

    // Fetch photos for target profile
    const targetPhotos = await this.photoService.getUserPhotos(targetUserId);

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
        { userId, targetUserId, status: 'matched' },
        { userId: targetUserId, targetUserId: userId, status: 'matched' },
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
          status: 'matched',
        })
        .sort({ matchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.matchModel.countDocuments({
        $or: [{ userId }, { targetUserId: userId }],
        status: 'matched',
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

    if (match.status !== 'matched') {
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
