import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { encryptMessage, decryptMessage } from '../common/encryption.util';
import { Message, MessageDocument } from 'src/Models/message.model';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async getLastMessageByRoomId(roomId: string) {
    const lastMsg = await this.messageModel.findOne({ roomId }).sort({ timestamp: -1 }).lean();
    if (!lastMsg) return null;
    return {
      ...lastMsg,
      message: decryptMessage(lastMsg.message) 
    }
  }

  async sendMessage(messageDto: { message: string; roomId: string; senderId: string }) {
    const encryptedMessage = encryptMessage(messageDto.message);
    const saved = await this.messageModel.create({
      roomId: messageDto.roomId,
      senderId: messageDto.senderId,
      message: encryptedMessage,
      timestamp: new Date()
    });
    return {
      ...saved.toObject(),
      message: messageDto.message
    };
  }

  async getMessages(roomId: string) {
    const docs = await this.messageModel.find({ roomId }).exec();
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