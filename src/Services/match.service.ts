import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from '../Models/match.model';
import { Swipe, SwipeDocument } from '../Models/swipe.model';
import { Profile, ProfileDocument } from '../Models/profile.model';

export interface MatchWithProfile {
  match: MatchDocument;
  profile: ProfileDocument;
}

@Injectable()
export class MatchService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Swipe.name) private swipeModel: Model<SwipeDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
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
      status: 'matched',
      matchedAt: new Date(),
    });

    // TODO: Send push notification to both users about the match

    return { matched: true, match };
  }

  async getMatches(userId: string): Promise<MatchWithProfile[]> {
    const matches = await this.matchModel
      .find({
        $or: [{ userId }, { targetUserId: userId }],
        status: 'matched',
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
        { userId, targetUserId, status: 'matched' },
        { userId: targetUserId, targetUserId: userId, status: 'matched' },
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
  async getMatchStatus(
    userId: string,
    targetUserId: string,
  ): Promise<{
    matched: boolean;
    userLiked: boolean;
    targetLiked: boolean;
  }> {
    const [userSwipe, targetSwipe, match] = await Promise.all([
      this.swipeModel.findOne({ userId, targetUserId }),
      this.swipeModel.findOne({ userId: targetUserId, targetUserId: userId }),
      this.matchModel.findOne({
        $or: [
          { userId, targetUserId, status: 'matched' },
          { userId: targetUserId, targetUserId: userId, status: 'matched' },
        ],
      }),
    ]);

    return {
      matched: !!match,
      userLiked: userSwipe?.action === 'like',
      targetLiked: targetSwipe?.action === 'like',
    };
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
}
