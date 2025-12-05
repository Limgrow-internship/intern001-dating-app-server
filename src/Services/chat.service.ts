import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { encryptMessage, decryptMessage } from '../common/encryption.util';
import { Message, MessageDocument } from 'src/Models/message.model';
import { MessageDTO } from 'src/DTO/message.dto';
import { Conversation } from 'src/Models/conversation.model';
import { AI_ASSISTANT_USER_ID } from 'src/common/constants';
import { Match, MatchDocument } from 'src/Models/match.model';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel('Conversation')
    private readonly conversationModel: Model<any>,
    @InjectModel(Match.name)
    private readonly matchModel: Model<MatchDocument>,
  ) {}

  async getMatchById(matchId: string): Promise<MatchDocument | null> {
    return this.matchModel.findById(matchId);
  }

  async getLastMessageBymatchId(matchId: string) {
    const lastMsg = await this.messageModel
      .findOne({ matchId, delivered: true })
      .sort({ timestamp: -1 })
      .lean();
    if (!lastMsg) return null;
    return {
      ...lastMsg,
      message: decryptMessage(lastMsg.message),
    };
  }

  async sendMessage(messageDto: MessageDTO) {
    const matchId = messageDto.matchId;
    const senderId = messageDto.senderId;
    const match = await this.matchModel.findById(matchId).lean();

   
    const encryptedMessage = messageDto.message
      ? encryptMessage(messageDto.message)
      : '';

    let delivered = true;
    if (match && match.status === 'blocked' && match.blockerId !== senderId) {
      delivered = false;
    }
    if (match && match.status === 'blocked' && match.blockerId === senderId) {
      throw new ForbiddenException('Bạn đã chặn người này, không thể gửi tin nhắn.');
    }

    const saved = await this.messageModel.create({
      matchId: messageDto.matchId,
      senderId: messageDto.senderId,
      message: encryptedMessage,
      imgChat: messageDto.imgChat,
      audioPath: messageDto.audioPath,
      duration: messageDto.duration,
      timestamp: messageDto.timestamp || new Date(),
      delivered: delivered,
    });


    return {
      ...saved.toObject(),
      message: messageDto.message ?? '',
      imgChat: messageDto.imgChat,
      audioPath: messageDto.audioPath,
      duration: messageDto.duration,
    };
  }

  async getMessages(matchId: string, forUserId?: string) {
    const match = await this.matchModel.findById(matchId).lean();
    const docs = await this.messageModel.find({ matchId }).exec();
  
    let messages = docs;
  
    if (match && match.status === 'blocked' && match.blockerId === forUserId) {
      messages = docs.filter(msg =>
        msg.delivered !== false || msg.senderId === forUserId
      );
    }
  
    return messages.map((msg) => {
      try {
        if (!msg.message) return { ...msg.toObject(), message: '' };
        const decrypted = decryptMessage(msg.message);
        return {
          ...msg.toObject(),
          message: decrypted || msg.message,
        };
      } catch (e) {
        console.error('Decrypt fail message: [encrypted]', e.message);
        return {
          ...msg.toObject(),
          message: '[Decrypt error]',
        };
      }
    });
  }

  async isAIConversation(matchId: string): Promise<boolean> {
    const conversation = await this.conversationModel.findOne({ matchId }).lean() as any;
    if (!conversation) return false;
    return (
      conversation.userId1 === AI_ASSISTANT_USER_ID ||
      conversation.userId2 === AI_ASSISTANT_USER_ID
    );
  }

  /**
   * Get conversation history for AI context
   */
  async getConversationHistoryForAI(matchId: string, limit: number = 10, aiProfile?: any): Promise<string[]> {
    const messages = await this.messageModel
      .find({ matchId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    const aiName = aiProfile?.firstName || 'Linh';
    
    return messages
      .reverse()
      .map(msg => {
        const decrypted = msg.message ? decryptMessage(msg.message) : '';
        const sender = msg.senderId === AI_ASSISTANT_USER_ID ? aiName : 'User';
        return `${sender}: ${decrypted || '[Media]'}`;
      });
  }
}