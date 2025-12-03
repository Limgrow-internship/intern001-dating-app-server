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
import { Message, MessageDocument } from 'src/Models/message.model';

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
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
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

  async unmatch(userId: string, targetUserId: string) {
    await this.matchModel.updateMany(
      {
        $or: [
          { userId, targetUserId },
          { userId: targetUserId, targetUserId: userId }
        ],
        status: 'active',
      },
      { $set: { status: 'unmatched', unmatchedAt: new Date() } }
    );
  
    const match = await this.matchModel.findOne({
      $or: [
        { userId, targetUserId },
        { userId: targetUserId, targetUserId: userId }
      ]
    }).sort({ updatedAt: -1 });
    return { status: match?.status ?? 'none' };
  }

  /**
   * Get match status between two users
   */
  async getMatchStatus(
    userId: string,
    targetUserId: string,
  ): Promise<{
    status: string;
    matched: boolean;
    userLiked: boolean;
    targetLiked: boolean;
  }> {
    console.log('[DEBUG getMatchStatus] INPUT userId:', userId, 'targetUserId:', targetUserId);
    const allMatches = await this.matchModel.find({
      $or: [
        { userId, targetUserId },
        { userId: targetUserId, targetUserId: userId }
      ]
    }).sort({ updatedAt: -1 });
  
    console.log('[DEBUG getMatchStatus] ALL MATCHES:', allMatches.map(m => {
      const doc = m as any;
      return {
        _id: doc._id.toString(),
        status: doc.status,
        userId: doc.userId,
        targetUserId: doc.targetUserId,
        updatedAt: doc.updatedAt,
      };
    }));
    const match = allMatches[0];
  
    if (match) {
      const doc = match as any;
      console.log('[DEBUG getMatchStatus] PICKED MATCH:', {
        _id: doc._id.toString(),
        status: doc.status,
        userId: doc.userId,
        targetUserId: doc.targetUserId,
        updatedAt: doc.updatedAt,
      });
    } else {
      console.log('[DEBUG getMatchStatus] PICKED MATCH: NONE');
    }
  
    const [userSwipe, targetSwipe] = await Promise.all([
      this.swipeModel.findOne({ userId, targetUserId }),
      this.swipeModel.findOne({ userId: targetUserId, targetUserId: userId }),
    ]);
  
    return {
      status: match?.status ?? 'none',
      matched: !!match && match.status === 'active',
      userLiked: userSwipe?.action === 'like',
      targetLiked: targetSwipe?.action === 'like',
    };
  }

  async getUsersWhoLikedYouWithPhotos(userId: string) {
    const swipes = await this.swipeModel.find({
      targetUserId: userId,
      action: 'like',
    });

    const userIds = swipes.map((s) => s.userId);

    if (userIds.length === 0) return [];

    const matchedRecords = await this.matchModel.find({
      $or: [
        { userId, targetUserId: { $in: userIds }, status: 'active' },
        { userId: { $in: userIds }, targetUserId: userId, status: 'active' },
      ],
    });

    const matchedUserIds = matchedRecords.map((m) =>
      m.userId === userId ? m.targetUserId : m.userId,
    );

    const filteredUserIds = userIds.filter(
      (id) => !matchedUserIds.includes(id),
    );

    if (filteredUserIds.length === 0) return [];

    const profiles = await this.profileModel.find({
      userId: { $in: filteredUserIds },
    });

    const result = await Promise.all(
      profiles.map(async (profile) => {
        const uid = profile.userId;

        const photos = await this.photoService.getUserPhotos(uid);

        const primaryPhoto = photos.find((p) => p.isPrimary) || null;

        return {
          userId: uid,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName:
            `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
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

    return { success: true };
  }
}
