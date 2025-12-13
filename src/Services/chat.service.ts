import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
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
    @InjectModel('Profile')
    private readonly profileModel: Model<any>,
  ) {}

  async getMatchById(matchId: string): Promise<MatchDocument | null> {
    if (!isValidObjectId(matchId)) return null;
    return this.matchModel.findById(matchId);
  }

  async getLastMessageBymatchId(matchId: string, userId: string) {
    const lastMsg = await this.messageModel
      .findOne({ matchId, delivered: true , deletedFor: { $ne: userId },})
      .sort({ timestamp: -1 })
      .lean();
    if (!lastMsg) return null;

    try {
      const decrypted = lastMsg.message ? decryptMessage(lastMsg.message) : '';
      return this.mapMessage(lastMsg, decrypted);
    } catch (e) {
      console.error('Decrypt fail last message: [encrypted]', (e as any)?.message || e);
      return this.mapMessage(lastMsg, '[Decrypt error]');
    }
  }

  async sendMessage(messageDto: MessageDTO) {
    const matchId = messageDto.matchId;
    const senderId = messageDto.senderId;
    const match = isValidObjectId(matchId)
      ? await this.matchModel.findById(matchId).lean()
      : null;

   
    const encryptedMessage = messageDto.message
      ? encryptMessage(messageDto.message)
      : '';

    const replyToTimestamp = messageDto.replyToTimestamp
      ? new Date(messageDto.replyToTimestamp as any)
      : undefined;

    const replyMeta = await this.buildReplyMeta(
      (messageDto as any).replyToMessageId,
      (messageDto as any).replyPreview,
      (messageDto as any).replySenderName,
    );

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
      clientMessageId: (messageDto as any).clientMessageId,
      replyToMessageId: (messageDto as any).replyToMessageId,
      replyToClientMessageId: (messageDto as any).replyToClientMessageId,
      replyToTimestamp,
      replyPreview: replyMeta?.replyPreview,
      replySenderId: replyMeta?.replySenderId,
      replySenderName: replyMeta?.replySenderName,
      reaction: messageDto.reaction,
      imgChat: messageDto.imgChat,
      audioPath: messageDto.audioPath,
      duration: messageDto.duration,
      timestamp: messageDto.timestamp || new Date(),
      delivered: delivered,
    });

    return this.mapMessage(saved, messageDto.message ?? '');
  }

  async getMessages(matchId: string, forUserId?: string) {
    const filter: any = { matchId };
    if (forUserId) {
      filter.deletedFor = { $ne: forUserId };
    }
    const match = isValidObjectId(matchId)
      ? await this.matchModel.findById(matchId).lean()
      : null;
  
    let docs = await this.messageModel.find(filter).exec();
  
  
    if (match && match.status === 'blocked' && match.blockerId === forUserId) {
      docs = docs.filter(msg =>
        msg.delivered !== false || msg.senderId === forUserId
      );
    }
  
    return docs.map((msg) => {
      try {
        if (!msg.message) return this.mapMessage(msg, '');
        const decrypted = decryptMessage(msg.message);
        return this.mapMessage(msg, decrypted || msg.message);
      } catch (e) {
        console.error('Decrypt fail message: [encrypted]', e.message);
        return this.mapMessage(msg, '[Decrypt error]');
      }
    });
  }

  async clearMessagesForUser(matchId: string, userId: string) {
    await this.messageModel.updateMany(
      { matchId, deletedFor: { $ne: userId } },
      { $addToSet: { deletedFor: userId } }
    );
    return { success: true };
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

  async reactMessage(params: {
    matchId: string;
    messageId?: string;
    clientMessageId?: string;
    reaction?: string;
  }) {
    const { matchId, messageId, clientMessageId, reaction } = params;
    if (!messageId && !clientMessageId) {
      throw new BadRequestException('messageId or clientMessageId is required');
    }

    const filter: any = { matchId };
    if (messageId) {
      filter._id = messageId;
    } else if (clientMessageId) {
      filter.clientMessageId = clientMessageId;
    }

    const updated = await this.messageModel
      .findOneAndUpdate(
        filter,
        { reaction: reaction ?? null },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    const decrypted = updated.message ? decryptMessage(updated.message) : '';
    return this.mapMessage(updated, decrypted);
  }

  private mapMessage(msg: MessageDocument | any, messageOverride?: string) {
    if (!msg) return null;
    
    const plain = typeof msg?.toObject === 'function' ? msg.toObject() : msg;
    const rawId = plain?._id ?? (plain as any)?.id;
    
    let id: string;
    if (typeof rawId === 'string') {
      id = rawId;
    } else if (rawId && typeof rawId.toString === 'function') {
      id = rawId.toString();
    } else {
      id = String(rawId || '');
    }

    let replyToMessageId: string | undefined = plain?.replyToMessageId;
    if (replyToMessageId) {
      if (typeof replyToMessageId !== 'string') {
        replyToMessageId = (replyToMessageId as any).toString();
      }
    }

    return {
      ...plain,
      id,
      replyToMessageId,
      message: messageOverride ?? plain?.message ?? '',
    };
  }

  private async buildReplyMeta(
    replyToMessageId?: string,
    replyPreviewInput?: string,
    replySenderNameInput?: string,
  ) {
    if (!replyToMessageId) return null;

    const replyMsg = await this.messageModel.findById(replyToMessageId).lean();
    if (!replyMsg) return null;

    const decrypted = replyMsg.message ? decryptMessage(replyMsg.message) : '';
    const preview =
      replyPreviewInput ||
      decrypted ||
      (replyMsg.imgChat ? '[Hình ảnh]' : replyMsg.audioPath ? '[Ghi âm]' : '');

    let replySenderName = replySenderNameInput;
    if (!replySenderName) {
      const profile = await this.profileModel
        .findOne({ userId: replyMsg.senderId })
        .select('firstName lastName')
        .lean() as any;
      replySenderName =
        (profile?.firstName || '') + (profile?.lastName ? ` ${profile.lastName}` : '');
      replySenderName = replySenderName.trim() || undefined;
    }

    return {
      replyPreview: preview,
      replySenderId: replyMsg.senderId,
      replySenderName,
    };
  }
}