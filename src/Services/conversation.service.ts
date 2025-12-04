import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Match, MatchDocument } from 'src/Models/match.model';
import { AI_ASSISTANT_USER_ID, AI_ASSISTANT_NAME } from 'src/common/constants';
import { ClientSession } from 'mongoose';

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

  /**
   * Ensure AI conversation exists for user, create if not
   */
  private async ensureAIConversation(userId: string): Promise<string | null> {
    // Check if AI conversation already exists
    const existingAIConversation = await this.conversationModel.findOne({
      $or: [
        { userId1: userId, userId2: AI_ASSISTANT_USER_ID },
        { userId1: AI_ASSISTANT_USER_ID, userId2: userId }
      ]
    }).lean() as any;

    if (existingAIConversation) {
      return existingAIConversation.matchId;
    }

    // Create AI match and conversation
    const session: ClientSession = await this.matchModel.db.startSession();
    session.startTransaction();

    try {
      // Create match with AI
      const [userId1, userId2] = userId < AI_ASSISTANT_USER_ID 
        ? [userId, AI_ASSISTANT_USER_ID] 
        : [AI_ASSISTANT_USER_ID, userId];

      // Check if match already exists
      const existingMatch = await this.matchModel
        .findOne({
          userId: userId1,
          targetUserId: userId2,
        })
        .session(session);

      let matchId: string;
      if (existingMatch) {
        matchId = (existingMatch as any)._id.toString();
      } else {
        const matchData = {
          userId: userId1,
          targetUserId: userId2,
          status: 'active',
          matchedAt: new Date(),
        };

        const [match] = await this.matchModel.create([matchData], { session });
        matchId = (match as any)._id.toString();
      }

      // Create conversation
      const conversationData = {
        matchId: matchId,
        userId1: userId,
        userId2: AI_ASSISTANT_USER_ID,
        status: 'active',
        lastActivityAt: new Date(),
      };

      await this.conversationModel.create([conversationData], { session });

      await session.commitTransaction();
      return matchId;
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating AI conversation:', error);
      return null;
    } finally {
      session.endSession();
    }
  }

  async listMatchedUsers(currentUserId: string): Promise<MatchedUserResult[]> {
    // Ensure AI conversation exists
    await this.ensureAIConversation(currentUserId);

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
  
    // Separate AI conversation from regular conversations
    const aiConversation = conversations.find(conv => 
      conv.userId1 === AI_ASSISTANT_USER_ID || conv.userId2 === AI_ASSISTANT_USER_ID
    );
    
    const regularConversations = conversations.filter(conv => 
      conv.userId1 !== AI_ASSISTANT_USER_ID && conv.userId2 !== AI_ASSISTANT_USER_ID
    );

    const matchedUserIds = regularConversations.map(conv =>
      conv.userId1 === currentUserId ? conv.userId2 : conv.userId1
    );
  
    const profiles = await this.profileModel.find({ userId: { $in: matchedUserIds } }).lean();
    const primaryPhotos = await this.photoModel.find({
      userId: { $in: matchedUserIds },
      isPrimary: true,
      isActive: true
    }).lean();
  
    const results: MatchedUserResult[] = [];
    
    // Add AI conversation first
    if (aiConversation) {
      results.push({
        matchId: aiConversation.matchId,
        lastActivityAt: aiConversation.lastActivityAt,
        matchedUser: {
          userId: AI_ASSISTANT_USER_ID,
          firstName: AI_ASSISTANT_NAME,
          lastName: '',
          url: null,
          age: null,
          city: '',
        },
        status: 'active'
      } as any);
    }
    
    // Add regular conversations
    for (const conv of regularConversations) {
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