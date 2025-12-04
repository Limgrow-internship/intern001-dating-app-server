import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { encryptMessage, decryptMessage } from '../common/encryption.util';
import { Message, MessageDocument } from 'src/Models/message.model';
import { MessageDTO } from 'src/DTO/message.dto';
import { Conversation } from 'src/Models/conversation.model';
import { AI_ASSISTANT_USER_ID } from 'src/common/constants';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel('Conversation')
    private readonly conversationModel: Model<any>,
  ) {}

  async getLastMessageBymatchId(matchId: string) {
    const lastMsg = await this.messageModel
      .findOne({ matchId })
      .sort({ timestamp: -1 })
      .lean();
    if (!lastMsg) return null;
    return {
      ...lastMsg,
      message: decryptMessage(lastMsg.message),
    };
  }

  async sendMessage(messageDto: MessageDTO) {
    const encryptedMessage = messageDto.message
      ? encryptMessage(messageDto.message)
      : '';
    const saved = await this.messageModel.create({
      matchId: messageDto.matchId,
      senderId: messageDto.senderId,
      message: encryptedMessage,
      imgChat: messageDto.imgChat,
      audioPath: messageDto.audioPath,
      duration: messageDto.duration,
      timestamp: messageDto.timestamp || new Date(),
    });
    return {
      ...saved.toObject(),
      message: messageDto.message ?? '',
      imgChat: messageDto.imgChat,
      audioPath: messageDto.audioPath,
      duration: messageDto.duration,
    };
  }

  async getMessages(matchId: string) {
    const docs = await this.messageModel.find({ matchId }).exec();
    return docs.map((msg) => {
      try {
        if (!msg.message) return { ...msg.toObject(), message: '' };
        const decrypted = decryptMessage(msg.message);
        return {
          ...msg.toObject(),
          message: decrypted || msg.message,
        };
      } catch (e) {
        console.error('Decrypt fail message:', msg.message, e);
        return {
          ...msg.toObject(),
          message: '[Decrypt error]',
        };
      }
    });
  }

  /**
   * Check if a matchId is an AI conversation
   */
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
  async getConversationHistoryForAI(matchId: string, limit: number = 10): Promise<string[]> {
    const messages = await this.messageModel
      .find({ matchId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return messages
      .reverse()
      .map(msg => {
        const decrypted = msg.message ? decryptMessage(msg.message) : '';
        const sender = msg.senderId === AI_ASSISTANT_USER_ID ? 'AI' : 'User';
        return `${sender}: ${decrypted || '[Media]'}`;
      });
  }
}