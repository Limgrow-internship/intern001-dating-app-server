import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Match, MatchDocument } from '../Models/match.model';
import { Swipe, SwipeDocument } from '../Models/swipe.model';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { Conversation, ConversationDocument } from '../Models/conversation.model';
import { BlockedUser, BlockedUserDocument } from '../Models/blocked-user.model';
import { User, UserDocument } from '../Models/user.model';
import { TargetProfileDto } from 'src/DTO/target-profile.dto';
import { PhotoService } from './photo.service';
import {
  AlreadyMatchedException,
  UserBlockedException,
  MatchNotFoundException,
} from '../Utils/match.exceptions';

export interface MatchWithProfile {
  match: MatchDocument;
  profile: ProfileDocument;
}

export interface MatchCreationResult {
  success: boolean;
  match?: MatchDocument;
  conversation?: ConversationDocument;
  error?: string;
}

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Swipe.name) private swipeModel: Model<SwipeDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(BlockedUser.name) private blockedUserModel: Model<BlockedUserDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private photoService: PhotoService,
  ) { }

  async handleSwipe(
    userId: string,
    targetUserId: string,
    action: 'like' | 'pass',
    score?: number,
  ): Promise<{ matched: boolean; match?: MatchDocument }> {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot swipe on yourself');
    }

    const targetProfile = await this.profileModel.findOne({
      userId: targetUserId,
    });
    if (!targetProfile) {
      throw new NotFoundException('Target profile not found');
    }

    const existingSwipe = await this.swipeModel.findOne({
      userId,
      targetUserId,
    });

    if (existingSwipe) {
      throw new BadRequestException('Already swiped on this user');
    }

    await this.swipeModel.create({
      userId,
      targetUserId,
      action,
      timestamp: new Date(),
      score,
    });

    if (action === 'pass') {
      return { matched: false };
    }

    const reciprocalLike = await this.swipeModel.findOne({
      userId: targetUserId,
      targetUserId: userId,
      action: 'like',
    });

    if (!reciprocalLike) {
      return { matched: false };
    }

    const match = await this.matchModel.create({
      userId,
      targetUserId,
      status: 'active',
      matchedAt: new Date(),
    });

    // TODO: Send push notification to both users about the match

    return { matched: true, match };
  }

  async getMatches(userId: string): Promise<MatchWithProfile[]> {
    const matches = await this.matchModel
      .find({
        $or: [{ userId }, { targetUserId: userId }],
        status: 'active',
      })
      .sort({ matchedAt: -1 })
      .exec();

    const matchesWithProfiles: MatchWithProfile[] = [];

    for (const match of matches) {
      const otherUserId =
        match.userId === userId ? match.targetUserId : match.userId;

      const profile = await this.profileModel.findOne({
        userId: otherUserId,
      });

      if (profile) {
        matchesWithProfiles.push({
          match,
          profile,
        });
      }
    }

    return matchesWithProfiles;
  }

  /**
   * Unmatch with a user
   */
  async unmatch(
    userId: string,
    targetUserId: string,
  ): Promise<{ success: boolean }> {
    const match = await this.matchModel.findOne({
      $or: [
        { userId, targetUserId, status: 'active' },
        { userId: targetUserId, targetUserId: userId, status: 'active' },
      ],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Update match status
    match.status = 'unmatched';
    match.unmatchedAt = new Date();
    await match.save();

    // TODO: Send notification to the other user about unmatch

    return { success: true };
  }

  /**
   * Get match status between two users
   */
  async getMatchStatus(userId: string, targetUserId: string) {
    const [userSwipe, targetSwipe, match] = await Promise.all([
      this.swipeModel.findOne({ userId, targetUserId }),
      this.swipeModel.findOne({ userId: targetUserId, targetUserId: userId }),
      this.matchModel.findOne({
        $or: [
          { userId, targetUserId, status: 'active' },
          { userId: targetUserId, targetUserId: userId, status: 'active' },
        ],
      }),
    ]);

    if (match) {
      return {
        matched: true,
        userLiked: userSwipe?.action === 'like',
        targetLiked: targetSwipe?.action === 'like',
        targetProfile: null,
      };
    }

    const targetLikedYou = targetSwipe?.action === 'like';

    let targetProfileData: any = null;

    if (targetLikedYou) {
      const profile = await this.profileModel.findOne({ userId: targetUserId });

      if (profile) {
        targetProfileData = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          age: profile.age,
          gender: profile.gender,
          bio: profile.bio,
          interests: profile.interests ?? [],
          city: profile.city,
          occupation: profile.occupation,
          height: profile.height,
        };
      }
    }
    return {
      matched: false,
      userLiked: userSwipe?.action === 'like',
      targetLiked: targetLikedYou,
      targetProfile: targetProfileData,
    };
  }

  async getUsersWhoLikedYouWithPhotos(userId: string) {
    const swipes = await this.swipeModel.find({
      targetUserId: userId,
      action: 'like',
    });

    const userIds = swipes.map((s) => s.userId);

    if (userIds.length === 0) return [];

    const profiles = await this.profileModel.find({
      userId: { $in: userIds },
    });

    const result = await Promise.all(
      profiles.map(async (profile) => {
        const uid = profile.userId;

        const [photos, primaryPhoto] = await Promise.all([
          this.photoService.getUserPhotos(uid),
          this.photoService.getPrimaryPhoto(uid),
        ]);

        return {
          userId: uid,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
          age: profile.age,
          city: profile.city ?? null,
          avatar: primaryPhoto?.url || null,

          photos: photos.map((p) => ({
            id: p._id,
            url: p.url,
            type: p.type,
            source: p.source,
            isPrimary: p.isPrimary,
            order: p.order,
            isVerified: p.isVerified,
            width: p.width,
            height: p.height,
            createdAt: p.createdAt,
          })),
        };
      }),
    );

    return result;
  }

  /**
   * Get swipe history for a user
   */
  async getSwipeHistory(
    userId: string,
    limit: number = 50,
  ): Promise<SwipeDocument[]> {
    return this.swipeModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Check if two users have blocked each other
   */
  async checkBlockStatus(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const block = await this.blockedUserModel.findOne({
      $or: [
        { blockerUserId: userId, blockedUserId: targetUserId },
        { blockerUserId: targetUserId, blockedUserId: userId },
      ],
    });

    return !!block;
  }

  /**
   * Check if match exists between two users
   */
  async checkMatchExists(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const match = await this.matchModel.findOne({
      $or: [
        { userId, targetUserId, status: 'active' },
        { userId: targetUserId, targetUserId: userId, status: 'active' },
      ],
    });

    return !!match;
  }

  /**
   * Check if user exists and is active
   */
  async checkUserActive(userId: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      id: userId,
      status: 'active',
    });

    return !!user;
  }

  /**
   * Create match with race condition prevention using MongoDB transaction
   */
  async createMatchWithLock(
    userAId: string,
    userBId: string,
  ): Promise<MatchCreationResult> {
    // Ensure consistent ordering to prevent duplicate matches
    const [userId1, userId2] =
      userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    const session: ClientSession = await this.matchModel.db.startSession();
    session.startTransaction();

    try {
      // Double-check: Match doesn't exist
      const existingMatch = await this.matchModel
        .findOne({
          userId: userId1,
          targetUserId: userId2,
        })
        .session(session);

      if (existingMatch) {
        await session.abortTransaction();
        this.logger.warn(`Match already exists: ${userId1} - ${userId2}`);
        return { success: false, error: 'ALREADY_MATCHED' };
      }

      // Create match record
      const matchData = {
        userId: userId1,
        targetUserId: userId2,
        status: 'active',
        matchedAt: new Date(),
      };

      const [match] = await this.matchModel.create([matchData], { session });

      // Create conversation room
      const conversationData = {
        matchId: (match as any)._id.toString(),
        userId1: userAId,
        userId2: userBId,
        status: 'active',
        lastActivityAt: new Date(),
      };

      const [conversation] = await this.conversationModel.create(
        [conversationData],
        { session },
      );

      // Commit transaction
      await session.commitTransaction();

      this.logger.log(
        `Match created successfully: ${userAId} - ${userBId}, Match ID: ${match._id}`,
      );

      // TODO: Send notifications to both users (async, non-blocking)
      // TODO: Emit WebSocket event for realtime update

      return {
        success: true,
        match,
        conversation,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Match creation failed', error);
      return { success: false, error: 'SERVER_ERROR' };
    } finally {
      session.endSession();
    }
  }

  /**
   * Check if there's a reciprocal like/superlike
   */
  async checkReciprocalLike(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const reciprocalSwipe = await this.swipeModel.findOne({
      userId: targetUserId,
      targetUserId: userId,
      action: 'like',
    });

    return !!reciprocalSwipe;
  }

  /**
   * Block a user
   */
  async blockUser(
    blockerUserId: string,
    blockedUserId: string,
    reason?: string,
  ): Promise<{ success: boolean }> {
    // Create block record
    await this.blockedUserModel.create({
      blockerUserId,
      blockedUserId,
      reason,
      blockedAt: new Date(),
    });

    // Update match status if exists
    await this.matchModel.updateMany(
      {
        $or: [
          { userId: blockerUserId, targetUserId: blockedUserId },
          { userId: blockedUserId, targetUserId: blockerUserId },
        ],
        status: 'active',
      },
      { status: 'blocked' },
    );

    this.logger.log(`User ${blockerUserId} blocked ${blockedUserId}`);
    return { success: true };
  }
}
