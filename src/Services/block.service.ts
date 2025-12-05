import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from '../Models/match.model';
import { Profile, ProfileDocument } from '../Models/profile.model';

@Injectable()
export class BlockService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
  ) {}

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) throw new BadRequestException('Cannot block yourself');

    const profile = await this.profileModel.findOne({ userId: targetUserId });
    if (!profile) throw new NotFoundException('Target user not found');

    const updated = await this.matchModel.updateMany(
      {
        $or: [
          { userId: userId, targetUserId: targetUserId },
          { userId: targetUserId, targetUserId: userId }
        ],
        status: 'active'
      },
      {
        status: 'blocked',
        blockerId: userId,
      }
    );

    if (updated.modifiedCount === 0) {
      await this.matchModel.create({
        userId: userId,
        targetUserId: targetUserId,
        status: 'blocked',
        blockerId: userId,
      });
    }
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    const result = await this.matchModel.updateMany(
      {
        $or: [
          { userId: userId, targetUserId: targetUserId },
          { userId: targetUserId, targetUserId: userId }
        ],
        status: 'blocked',
        blockerId: userId
      },
      {
        status: 'active',
        blockerId: null,
      }
    );
    if (result.matchedCount === 0) throw new BadRequestException('No blocked match found or you are not the blocker');
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const blocked = await this.matchModel.findOne({
      $or: [
        { userId: userId, targetUserId: targetUserId },
        { userId: targetUserId, targetUserId: userId }
      ],
      status: 'blocked'
    });
    return !!blocked;
  }

  async getBlocker(userId: string, targetUserId: string): Promise<string | null> {
    const match = await this.matchModel.findOne({
      $or: [
        { userId: userId, targetUserId: targetUserId },
        { userId: targetUserId, targetUserId: userId }
      ],
      status: 'blocked'
    });
    return match?.blockerId ?? null;
  }
}