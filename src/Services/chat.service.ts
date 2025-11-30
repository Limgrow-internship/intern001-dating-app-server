import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { encryptMessage, decryptMessage } from '../common/encryption.util';
import { Message, MessageDocument } from 'src/Models/message.model';
import { MessageDTO } from 'src/DTO/message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async getLastMessageBymatchId(matchId: string) {
    const lastMsg = await this.messageModel.findOne({ matchId }).sort({ timestamp: -1 }).lean();
    if (!lastMsg) return null;
    return {
      ...lastMsg,
      message: decryptMessage(lastMsg.message) 
    }
  }

  async sendMessage(messageDto: MessageDTO) {
    const encryptedMessage = messageDto.message ? encryptMessage(messageDto.message) : '';
    const saved = await this.messageModel.create({
      matchId: messageDto.matchId,
      senderId: messageDto.senderId,
      message: encryptedMessage,
      audioPath: messageDto.audioPath,
      duration: messageDto.duration,
      timestamp: messageDto.timestamp || new Date()
    });
    return {
      ...saved.toObject(),
      message: messageDto.message ?? '',
      audioPath: messageDto.audioPath,
      duration: messageDto.duration
    };
  }

  async getMessages(matchId: string) {
    const docs = await this.messageModel.find({ matchId }).exec();
    return docs.map(msg => {
      try {
        if (!msg.message) return { ...msg.toObject(), message: '' };
        const decrypted = decryptMessage(msg.message);
        return {
          ...msg.toObject(),
          message: decrypted || msg.message
        }
      } catch (e) {
        console.error('Decrypt fail message:', msg.message, e);
        
        return {
          ...msg.toObject(),
          message: '[Decrypt error]' 
        }
      }
    });
  }
}