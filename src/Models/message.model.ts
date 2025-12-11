import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema()
export class Message {
  @Prop({ required: true })
  matchId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop()
  message: string;

  @Prop()
  clientMessageId?: string;

  @Prop()
  audioPath?: string;     

  @Prop()
  duration?: number;

  @Prop()
  imgChat?: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: true })
  delivered: boolean;

  @Prop({ type: [String], default: [] })
  deletedFor: string[];

}

export const MessageSchema = SchemaFactory.createForClass(Message);