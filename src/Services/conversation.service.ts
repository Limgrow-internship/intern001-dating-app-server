import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from 'src/Models/match.model';

type MatchedUserResult = {
  matchId: any;
  lastActivityAt: any;
  matchedUser: {
    userId: string;
    firstName: string;
    lastName: string;
    url: string | null;
    age: number | null;
    city: number | '';
  };
};

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel('Conversation') private conversationModel: Model<any>,
    @InjectModel('Profile') private profileModel: Model<any>,
    @InjectModel('Photo') private photoModel: Model<any>,
    @InjectModel('Message') private messageModel: Model<any>,
    @InjectModel(Match.name) private matchModel: Model<MatchDocument>
  ) {}

  private getAge(dateOfBirth: string | Date | null): number | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  async listMatchedUsers(currentUserId: string): Promise<MatchedUserResult[]> {
    const activeMatches = await this.matchModel.find({
      $or: [
        { userId: currentUserId },
        { targetUserId: currentUserId }
      ],
      status: { $in: ['active', 'unmatched'] }
    }).select('_id userId targetUserId status').lean();
  
    const matchIdToStatus = new Map();
    activeMatches.forEach(m => matchIdToStatus.set(m._id.toString(), m.status));
  
    const matchIds = activeMatches.map(m => m._id);
    const conversations = await this.conversationModel.find({
      matchId: { $in: matchIds },
      $or: [
        { userId1: currentUserId },
        { userId2: currentUserId }
      ]
    }).lean();
  
    const matchedUserIds = conversations.map(conv =>
      conv.userId1 === currentUserId ? conv.userId2 : conv.userId1
    );
  
    const profiles = await this.profileModel.find({ userId: { $in: matchedUserIds } }).lean();
    const primaryPhotos = await this.photoModel.find({
      userId: { $in: matchedUserIds },
      isPrimary: true,
      isActive: true
    }).lean();
  
    const results: MatchedUserResult[] = [];
    for (const conv of conversations) {
      const otherUserId = conv.userId1 === currentUserId ? conv.userId2 : conv.userId1;
      const profile = profiles.find(p => p.userId === otherUserId);
  
      let photo = primaryPhotos.find(ph => ph.userId === otherUserId);
      if (!photo) {
        photo = await this.photoModel.findOne({ userId: otherUserId, isActive: true }).sort({ createdAt: 1 }).lean() as any;
      }
  
      results.push({
        matchId: conv.matchId,
        lastActivityAt: conv.lastActivityAt,
        matchedUser: {
          userId: profile?.userId || otherUserId,
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          url: photo?.url || null,
          age: this.getAge(profile?.dateOfBirth || null),
          city: profile?.city || '',
        },
        status: matchIdToStatus.get(conv.matchId?.toString()) || 'active'
      } as any);
    }
  
    return results;
  }

  async deleteForUser(matchId: string, userId: string) {
    const conversation = await this.conversationModel.findOneAndUpdate(
      { matchId },
      { $addToSet: { deletedBy: userId } },
      { new: true }
    );

    if (
      conversation &&
      conversation.deletedBy &&
      [conversation.userId1, conversation.userId2].every(
        (u: string) => conversation.deletedBy.includes(u)
      )
    ) {
      await this.messageModel.deleteMany({ matchId });
      await this.conversationModel.deleteOne({ matchId });
    }

    return { success: true };
  }
}